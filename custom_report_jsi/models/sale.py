# -*- coding: utf-8 -*-

from odoo import fields, models


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    delivery = fields.Selection([
        ('included', 'Delivery Included'),
        ('not_included', 'Delivery not included'),
        ('return', 'Delivery but not return included'),
    ], default='included')
