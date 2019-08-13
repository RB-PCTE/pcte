# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'Stock Account Custom - PCTE',
    'version': '1.1',
    'category': 'Account',
    'description': """
Custom stock account for PCTE

    """,
    'author': "Havi Technology",
    'website': "havi.com.au",
    'depends': ['stock_account','purchase_discount'],
    'data': [
        'views/res_config_settings.xml',
        'wizards/update_journal_entries.xml',
    ],
}
