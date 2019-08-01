# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, exceptions, api, _
import logging
from odoo.tools import float_compare, float_round, float_is_zero, pycompat
_logger = logging.getLogger(__name__)


class ProductProduct(models.Model):
    _inherit = 'product.product'

    def _get_anglo_saxon_price_unit(self, uom=False):
        use_supplier_price = self.env['ir.config_parameter'].sudo().get_param('stock_account_custom.use_supplier_price')
        if use_supplier_price:
            price = self.standard_price
            for supplier in self.seller_ids:
                if supplier.name.id != 1:
                    price = supplier.price * (1 - (self.product_tmpl_id.supplier_discount / 100))
                    price = supplier.currency_id.with_context(date=fields.Date.today()).compute(price, self.env.user.company_id.currency_id)
            if not self or not uom or self.uom_id.id == uom.id:
                return price or 0.0
            return self.uom_id._compute_price(price, uom)
        else:
            return super(ProductProduct, self)._get_anglo_saxon_price_unit(uom=uom)

