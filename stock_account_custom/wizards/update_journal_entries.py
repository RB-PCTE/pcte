# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import datetime
from odoo import api, fields, models, _
from odoo.exceptions import UserError
import xlrd, sys, os
import logging
_logger = logging.getLogger(__name__)

try:
    from xmlrpc import client as xmlrpclib
except ImportError:
    import xmlrpclib

class WizardUpdateJournalEntries(models.TransientModel):
    _name = 'wizard.update.journal.entries'
    _description = 'Update journal entries'

    company_id = fields.Many2one('res.company', string='Company', required=1)
    journal_id = fields.Many2one('account.journal', string='Journal', required=1)
    update_from_date = fields.Date(string='Update from date', required=1)
    update_to_date = fields.Date(string='Update to date', required=1)

    @api.multi
    def update_journal_entries(self):
        for wiz in self:
            all_entries = self.env['account.move'].search([('journal_id', '=', wiz.journal_id.id),('date','>=', wiz.update_from_date),('date','<=', wiz.update_to_date),('company_id','=', wiz.company_id.id)])
            for move in all_entries:
                # update price unit in stock move
                # update debit, credit in account move line
                if move.stock_move_id:
                    _logger.info("[MOVE NAME] {}".format(move.name))
                    if move.stock_move_id.purchase_line_id and move.stock_move_id.purchase_line_id.discount and move.stock_move_id.purchase_line_id.discount !=0 and move.stock_move_id.price_unit:
                        _logger.info("[INCOMING] Price before change {}".format(move.stock_move_id.price_unit))
                        new_price = move.stock_move_id.price_unit*(1-(move.stock_move_id.purchase_line_id.discount/100))
                        move.stock_move_id.write({'price_unit': new_price})
                        if new_price < 0:
                            new_price = new_price*-1
                        move.button_cancel()
                        for move_line in move.line_ids:
                            if move_line.credit != 0:
                                self._cr.execute("""UPDATE  account_move_line set credit=%s WHERE id=%s""", (new_price*move.stock_move_id.quantity_done,move_line.id))
                            if move_line.debit != 0:
                                self._cr.execute("""UPDATE   account_move_line set debit=%s WHERE id=%s""", (new_price*move.stock_move_id.quantity_done, move_line.id))
                        move._amount_compute()
                        move._post_validate()
                        move.post()
                        _logger.info("[INCOMING] Price after change {}".format(new_price))
                    else:
                        if move.stock_move_id.product_id.supplier_discount and move.stock_move_id.picking_type_id.code == 'outgoing':
                            _logger.info("[OUTGOING] Price before change {}".format(move.stock_move_id.price_unit))
                            new_price = move.stock_move_id.price_unit * (1 - (move.stock_move_id.product_id.supplier_discount / 100))
                            move.stock_move_id.write({'price_unit': new_price})
                            if new_price < 0:
                                new_price = new_price * -1
                            move.button_cancel()
                            for move_line in move.line_ids:
                                if move_line.credit != 0:
                                    self._cr.execute("""UPDATE  account_move_line set credit=%s, balance=%s WHERE id=%s""",(new_price*move.stock_move_id.quantity_done,new_price*move.stock_move_id.quantity_done, move_line.id))
                                if move_line.debit != 0:
                                    self._cr.execute("""UPDATE   account_move_line set debit=%s, balance=%s WHERE id=%s""",(new_price*move.stock_move_id.quantity_done,new_price*move.stock_move_id.quantity_done, move_line.id))
                            move._amount_compute()
                            move._post_validate()
                            move.post()
                            _logger.info("[OUTGOING] Price after change {}".format(new_price))
                else:
                    expense_account_code = ['5-1001', '5-1002', '5-1003','5-1004', '5-1005']
                    if move.line_ids.filtered(lambda r: r.account_id.code in expense_account_code):
                        _logger.info("[INVOICE] Price after change {}".format(move.name))
                        move.button_cancel()
                        for move_line in move.line_ids:
                            if move_line.product_id:
                                price = move_line.product_id.standard_price
                                for supplier in move_line.product_id.product_tmpl_id.seller_ids:
                                    if supplier.name.id != 1:
                                        price = supplier.price * (1 - (move_line.product_id.product_tmpl_id.supplier_discount / 100))
                                        price = supplier.currency_id.with_context(date=move.date).compute(price, move.company_id.currency_id)
                                if (move_line.account_id.id == move_line.product_id.product_tmpl_id.categ_id.property_account_expense_categ_id.id or move_line.account_id.code in expense_account_code) and move_line.debit !=0.0:
                                    self._cr.execute("""UPDATE  account_move_line set debit=%s,balance=%s WHERE id=%s""",(price * move_line.quantity,price * move_line.quantity, move_line.id))
                                if move_line.account_id.id == move_line.product_id.product_tmpl_id.categ_id.property_stock_account_output_categ_id.id and move_line.credit !=0.0:
                                    self._cr.execute("""UPDATE  account_move_line set credit=%s, balance=%s WHERE  id=%s""",(price * move_line.quantity,price * move_line.quantity, move_line.id))
                        move._amount_compute()
                        move._post_validate()
                        move.post()

class WizardDeleteAccountAccount(models.TransientModel):
    _name = 'wizard.delete.account.account'

    def _default_account_ids(self):
        account_ids = self._context.get('active_model') == 'account.account' and self._context.get('active_ids') or []
        return [(6, 0, account_ids)]

    account_ids = fields.Many2many('account.account', string='Accounts', default=_default_account_ids)

    @api.multi
    def button_delete_account(self):
        for account in self.account_ids:
            values = ['account.account,%s' % (account.id,)]
            partner_prop_accs = self.env['ir.property'].search([('value_reference', 'in', values)])
            for partner_prop_acc in partner_prop_accs:
                _logger.info(values)
                #136->804, 154 -> 814
                account_replace = self.env['account.account'].search([('name', '=', account.name),('deprecated','=', False),('company_id','=', account.company_id.id)])
                if account_replace:
                    partner_prop_acc.write({'value_reference': 'account.account,%s'%account_replace.id})
                    _logger.info('update value reference')
                elif account.id==136:
                    partner_prop_acc.write({'value_reference': 'account.account,%s' % 804})
                    _logger.info('update value reference by id')
                    invoice_ids = self.env['account.invoice'].search([('account_id','=', 136)])
                    invoice_ids.write({'account_id': 804})
                elif account.id==154:
                    partner_prop_acc.write({'value_reference': 'account.account,%s' % 814})
                    _logger.info('update value reference by id')
                    invoice_ids = self.env['account.invoice'].search([('account_id', '=', 136)])
                    invoice_ids.write({'account_id': 804})
                else:
                    if not partner_prop_acc.res_id:
                        partner_prop_acc.write({'value_reference': ''})
                        _logger.info('update empty value reference')
            account.unlink()
            _logger.info('delete success')



