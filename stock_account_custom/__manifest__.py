# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'Stock Account Custom - PCTE',
    'version': '15.0.1.0.0',
    'category': 'Account',
    'description': """
Custom stock account for PCTE

    """,
    'license': "OEEL-1",
    'author': "Havi Technology",
    'website': "havi.com.au",
    'depends': ['stock_account', 'purchase_discount'],
    'data': [
        'security/ir.model.access.csv',
        'views/res_config_settings.xml',
        'wizards/update_journal_entries.xml',
    ],
}
