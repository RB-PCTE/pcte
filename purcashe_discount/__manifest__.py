# -*- coding: utf-8 -*-
{
    'name': "PCTE Purchase discount",

    'summary': """
        PCTE Purchase discount""",

    'description': """
        PCTE Purchase discount
    """,

    'author': "Odoo",
    'website': "http://www.odoo.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/master/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['purchase'],

    # always loaded
    'data': [
        'views/purchase_product.xml',
    ],
    'installable': True,
    'application': True,

}
