# -*- coding: utf-8 -*-

{
    "name": "PCTE Purchase discount and compute selling price",
    "summary": """
        PCTE Purchase discount and compute selling price
        """,
    "category": "",
    "version": "15.0.1.0.0",
    "author": "Odoo PS",
    "website": "https://www.odoo.com",
    "license": "OEEL-1",
    'depends': ['purchase', 'sale_management'],
    'data': [
        'views/purchase_product.xml',
        'views/sale.xml',
        'views/shipping_info.xml',
        'security/ir.model.access.csv',
    ],
}
