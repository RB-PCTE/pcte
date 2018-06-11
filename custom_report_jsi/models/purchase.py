# -*- coding: utf-8 -*-

from odoo import fields, models


class PurchaseOrder(models.Model):
    _inherit = 'purchase.order'

    shipping_method = fields.Selection([
        ('fedex_int_econ', 'Fedex Int Econ'),
        ('fedex_int_priority', 'FexEx Int Priority'),
        ('fedex_box', 'FedEx Box '),
        ('hellmann_air_freight', 'Hellmann Air Freight'),
        ('hellmann_sea_freight', 'Hellmann Sea Freight'),
        ('blue_water_air_freight', 'Blue Water Air Freight'),
        ('blue_water_sea_freight', 'Blue Water Sea Freight'),
        ('own_shipping_method', 'Your own shipping method'),
    ])
