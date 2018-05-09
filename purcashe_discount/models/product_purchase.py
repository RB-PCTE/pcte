# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import base64
import io
import re

from datetime import datetime, timedelta
from ebaysdk.exception import ConnectionError
from odoo.addons.sale_ebay.tools.ebaysdk import Trading
from xml.sax.saxutils import escape

from odoo import models, fields, api, _
from odoo.exceptions import UserError, RedirectWarning
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT

# eBay api limits ItemRevise calls to 150 per day
MAX_REVISE_CALLS = 150


class ProductTemplate(models.Model):
    _inherit = "product.template"

    supplier_discount = fields.Float(string="Supplier Discount(%)")


class PurchaseOrderLine(models.Model):
    _inherit = "purchase.order.line"


    discount = fields.Float(string="Discount(%)")

    @api.onchange('product_id')
    def onchange_product_discount(self):
        self.discount = self.product_id and self.product_id.supplier_discount

    @api.depends('product_qty', 'price_unit', 'taxes_id', 'discount')
    def _compute_amount(self):
        for line in self:
            if line.discount:
                price_unit = line.price_unit * (100.0 - line.discount)/100.0
            else:
                price_unit = line.price_unit
            taxes = line.taxes_id.compute_all(price_unit, line.order_id.currency_id, line.product_qty, product=line.product_id, partner=line.order_id.partner_id)
            line.update({
                'price_tax': sum(t.get('amount', 0.0) for t in taxes.get('taxes', [])),
                'price_total': taxes['total_included'],
                'price_subtotal': taxes['total_excluded'],
            })
