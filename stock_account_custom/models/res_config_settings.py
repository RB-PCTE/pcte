# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, exceptions, api, _
import logging
_logger = logging.getLogger(__name__)

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    use_supplier_price = fields.Boolean(string="User Supplier Price for Stock Journal")

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        res.update(
            use_supplier_price=self.env['ir.config_parameter'].sudo().get_param(
                'stock_account_custom.use_supplier_price')
        )
        return res

    @api.multi
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        self.env['ir.config_parameter'].sudo().set_param('stock_account_custom.use_supplier_price',
                                                         self.use_supplier_price)