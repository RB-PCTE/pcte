# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models
from odoo.tools.float_utils import float_round


class PurchaseOrderLine(models.Model):
    _inherit = 'purchase.order.line'

    def _get_stock_move_price_unit(self):
        use_supplier_price = self.env['ir.config_parameter'].sudo().get_param('stock_account_custom.use_supplier_price')
        if use_supplier_price and self.discount:
            self.ensure_one()
            order = self.order_id
            price_unit = self.price_unit * (1 - (self.discount / 100))
            price_unit_prec = self.env['decimal.precision'].precision_get('Product Price')
            if self.taxes_id:
                qty = self.product_qty or 1
                price_unit = self.taxes_id.with_context(round=False).compute_all(
                    price_unit, currency=self.order_id.currency_id, quantity=qty, product=self.product_id,
                    partner=self.order_id.partner_id
                )['total_void']
                price_unit = float_round(price_unit / qty, precision_digits=price_unit_prec)
            if self.product_uom.id != self.product_id.uom_id.id:
                price_unit *= self.product_uom.factor / self.product_id.uom_id.factor
            if order.currency_id != order.company_id.currency_id:
                price_unit = order.currency_id._convert(
                    price_unit, order.company_id.currency_id, self.company_id, self.date_order or fields.Date.today(),
                    round=False)
            return price_unit
        return super(PurchaseOrderLine, self)._get_stock_move_price_unit()
