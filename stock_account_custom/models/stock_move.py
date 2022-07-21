# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, exceptions, api, _
import logging
from odoo.tools import float_compare, float_round, float_is_zero, pycompat
_logger = logging.getLogger(__name__)


class StockMove(models.Model):
    _inherit = 'stock.move'

    def _get_price_unit(self):
        """ Returns the unit price to store on the quant """
        use_supplier_price = self.env['ir.config_parameter'].sudo().get_param('stock_account_custom.use_supplier_price')
        price_unit = super(StockMove, self)._get_price_unit()
        _logger.info("Price unit of _get_price_unit is {}".format(price_unit))
        if use_supplier_price:
            supplier_price = self.product_id.standard_price
            for supplier in self.product_id.seller_ids:
                if supplier.name.id != self.company_id.partner_id.id:
                    supplier_price = supplier.price * (1 - (self.product_id.product_tmpl_id.supplier_discount / 100))
                    supplier_price = supplier.currency_id.with_context(date=self.date).compute(supplier_price, self.warehouse_id.company_id.currency_id)
            _logger.info("Price after discount: {}".format(supplier_price))
            return supplier_price
        else:
            return price_unit
