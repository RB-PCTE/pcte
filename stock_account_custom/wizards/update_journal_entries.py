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
                    if move.stock_move_id.purchase_line_id and move.stock_move_id.purchase_line_id.discount and move.stock_move_id.purchase_line_id.discount !=0 and move.price_unit:
                        _logger.info("[INCOMING] Price before change {}".format(move.stock_move_id.price_unit))
                        new_price = move.price_unit*(1-(move.stock_move_id.purchase_line_id.discount/100))
                        move.stock_move_id.write({'price_unit': new_price})
                        for move_line in move.line_ids:
                            if move_line.credit != 0:
                                move_line.write({'credit': new_price})
                            if move_line.debit != 0:
                                move_line.write({'debit': new_price})
                        _logger.info("[INCOMING] Price after change {}".format(new_price))
                    else:
                        if move.stock_move_id.product_id.supplier_discount and move.stock_move_id.picking_type_id.code == 'outgoing':
                            _logger.info("[OUTGOING] Price before change {}".format(move.stock_move_id.price_unit))
                            new_price = move.price_unit * (1 - (move.stock_move_id.product_id.supplier_discount / 100))
                            move.stock_move_id.write({'price_unit': new_price})
                            for move_line in move.line_ids:
                                if move_line.credit != 0:
                                    move_line.write({'credit': new_price})
                                if move_line.debit != 0:
                                    move_line.write({'debit': new_price})
                            _logger.info("[OUTGOING] Price after change {}".format(new_price))

