"""
Management command to seed the database with demo product data.

Usage:
    python manage.py seed_products

This will create sellers and products matching the frontend demo data.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.users.models import User, SellerProfile, BuyerProfile
from apps.products.models import Product, Review
from decimal import Decimal


class Command(BaseCommand):
    help = 'Seed database with demo products and sellers'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing products and sellers before seeding',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting product seeding...'))

        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing products and reviews...'))
            Review.objects.all().delete()
            Product.objects.all().delete()
            # Optionally clear sellers, but be careful
            # SellerProfile.objects.all().delete()
            # User.objects.filter(role=User.RoleChoices.SELLER).delete()

        # Demo sellers data
        sellers_data = [
            {
                'email': 'greenvalley@farm.com',
                'first_name': 'Green',
                'last_name': 'Valley',
                'store_name': 'Green Valley Farm',
                'pickup_address': '123 Farm Road, Farm City, Bangladesh',
                'phone_number': '+8801234567890',
                'nid_number': '1234567890123',
                'is_admin_verified': True,
                'is_email_verified': True,
                'is_profile_completed': True,
                'is_active': True,
            },
            {
                'email': 'sunrise@farm.com',
                'first_name': 'Sunrise',
                'last_name': 'Agriculture',
                'store_name': 'Sunrise Agriculture',
                'pickup_address': '456 Agriculture Lane, Farm District, Bangladesh',
                'phone_number': '+8801234567891',
                'nid_number': '1234567890124',
                'is_admin_verified': True,
                'is_email_verified': True,
                'is_profile_completed': True,
                'is_active': True,
            },
            {
                'email': 'naturesbest@farm.com',
                'first_name': 'Nature\'s',
                'last_name': 'Best',
                'store_name': 'Nature\'s Best Farm',
                'pickup_address': '789 Organic Street, Green Valley, Bangladesh',
                'phone_number': '+8801234567892',
                'nid_number': '1234567890125',
                'is_admin_verified': True,
                'is_email_verified': True,
                'is_profile_completed': True,
                'is_active': True,
            },
            {
                'email': 'tropical@farm.com',
                'first_name': 'Tropical',
                'last_name': 'Farm',
                'store_name': 'Tropical Farm',
                'pickup_address': '321 Fruit Garden Road, Coastal Area, Bangladesh',
                'phone_number': '+8801234567893',
                'nid_number': '1234567890126',
                'is_admin_verified': True,
                'is_email_verified': True,
                'is_profile_completed': True,
                'is_active': True,
            },
        ]

        # Create or get sellers
        sellers = []
        for seller_data in sellers_data:
            user, created = User.objects.get_or_create(
                email=seller_data['email'],
                defaults={
                    'first_name': seller_data['first_name'],
                    'last_name': seller_data['last_name'],
                    'phone_number': seller_data['phone_number'],
                    'role': User.RoleChoices.SELLER,
                    'is_admin_verified': seller_data['is_admin_verified'],
                    'is_email_verified': seller_data['is_email_verified'],
                    'is_profile_completed': seller_data['is_profile_completed'],
                    'is_active': seller_data['is_active'],
                }
            )
            
            if not created:
                # Update existing user
                for key, value in seller_data.items():
                    if key not in ['store_name', 'pickup_address', 'nid_number']:
                        setattr(user, key, value)
                user.save()

            # Create or update seller profile
            profile, profile_created = SellerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'store_name': seller_data['store_name'],
                    'pickup_address': seller_data['pickup_address'],
                    'nid_number': seller_data['nid_number'],
                }
            )
            
            if not profile_created:
                profile.store_name = seller_data['store_name']
                profile.pickup_address = seller_data['pickup_address']
                profile.nid_number = seller_data['nid_number']
                profile.save()

            sellers.append(user)
            self.stdout.write(
                self.style.SUCCESS(f'✓ Seller: {seller_data["store_name"]} ({user.email})')
            )

        # Demo products data (matching frontend demoProducts)
        products_data = [
            {
                'name': 'Fresh Organic Tomatoes',
                'description': 'Premium organic tomatoes harvested fresh from local farms. Perfect for salads, cooking, and fresh consumption.',
                'price': Decimal('80.00'),
                'stock': 150,
                'unit': 'kg',
                'category': 'Vegetables',
                'image': 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&h=600&fit=crop',
                'verified': True,
                'seller': sellers[0],  # Green Valley Farm
            },
            {
                'name': 'Farm Fresh Potatoes',
                'description': 'High quality potatoes, perfect for everyday cooking and various dishes.',
                'price': Decimal('45.00'),
                'stock': 200,
                'unit': 'kg',
                'category': 'Vegetables',
                'image': 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=800&h=600&fit=crop',
                'verified': True,
                'seller': sellers[1],  # Sunrise Agriculture
            },
            {
                'name': 'Organic Green Beans',
                'description': 'Fresh, crisp green beans picked at peak freshness. Rich in nutrients.',
                'price': Decimal('120.00'),
                'stock': 80,
                'unit': 'kg',
                'category': 'Vegetables',
                'image': 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=800&h=600&fit=crop',
                'verified': True,
                'seller': sellers[2],  # Nature's Best Farm
            },
            {
                'name': 'Fresh Mangoes',
                'description': 'Sweet, juicy mangoes from local orchards. Seasonal and delicious.',
                'price': Decimal('150.00'),
                'stock': 50,
                'unit': 'kg',
                'category': 'Fruits',
                'image': 'https://images.unsplash.com/photo-1605027990121-3fdb7a2e5b0f?w=800&h=600&fit=crop',
                'verified': True,
                'seller': sellers[3],  # Tropical Farm
            },
            {
                'name': 'Organic Red Onions',
                'description': 'Fresh red onions with strong flavor, perfect for cooking.',
                'price': Decimal('65.00'),
                'stock': 180,
                'unit': 'kg',
                'category': 'Vegetables',
                'image': 'https://images.unsplash.com/photo-1618512496242-a07f41e9c88e?w=800&h=600&fit=crop',
                'verified': True,
                'seller': sellers[0],  # Green Valley Farm
            },
            {
                'name': 'Fresh Cauliflower',
                'description': 'Premium quality cauliflower, white and fresh.',
                'price': Decimal('90.00'),
                'stock': 60,
                'unit': 'kg',
                'category': 'Vegetables',
                'image': 'https://images.unsplash.com/photo-1584270354949-b26bddf3342c?w=800&h=600&fit=crop',
                'verified': True,
                'seller': sellers[1],  # Sunrise Agriculture
            },
        ]

        # Create products
        created_count = 0
        updated_count = 0
        for product_data in products_data:
            product, created = Product.objects.get_or_create(
                name=product_data['name'],
                seller=product_data['seller'],
                defaults=product_data
            )
            
            if not created:
                # Update existing product
                for key, value in product_data.items():
                    setattr(product, key, value)
                product.save()
                updated_count += 1
            else:
                created_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Product: {product_data["name"]} ({product_data["seller"].seller_profile.store_name})')
            )

        # Create some demo reviews for products
        # First, create a demo buyer
        buyer_email = 'freshmarket@example.com'
        buyer, buyer_created = User.objects.get_or_create(
            email=buyer_email,
            defaults={
                'first_name': 'Fresh',
                'last_name': 'Market',
                'role': User.RoleChoices.BUYER,
                'is_email_verified': True,
                'is_profile_completed': True,
                'is_active': True,
            }
        )
        
        if buyer_created:
            BuyerProfile.objects.create(
                user=buyer,
                business_name='Fresh Market Co.',
                delivery_address='456 Main Street, Dhaka, Bangladesh',
                nid_number='9876543210123',
            )

        # Create reviews
        reviews_data = [
            {'product_name': 'Fresh Organic Tomatoes', 'rating': 5, 'comment': 'Excellent quality tomatoes! Very fresh and delivered on time.'},
            {'product_name': 'Farm Fresh Potatoes', 'rating': 4, 'comment': 'Good quality potatoes. Would order again.'},
        ]

        for review_data in reviews_data:
            try:
                product = Product.objects.get(name=review_data['product_name'])
                Review.objects.get_or_create(
                    product=product,
                    buyer=buyer,
                    defaults={
                        'rating': review_data['rating'],
                        'comment': review_data['comment'],
                    }
                )
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Review: {review_data["product_name"]} ({review_data["rating"]} stars)')
                )
            except Product.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f'⚠ Product not found: {review_data["product_name"]}')
                )

        self.stdout.write(self.style.SUCCESS('\n' + '='*50))
        self.stdout.write(self.style.SUCCESS(f'✓ Created {created_count} new products'))
        self.stdout.write(self.style.SUCCESS(f'✓ Updated {updated_count} existing products'))
        self.stdout.write(self.style.SUCCESS(f'✓ Total sellers: {len(sellers)}'))
        self.stdout.write(self.style.SUCCESS('Product seeding completed successfully!'))
        self.stdout.write(self.style.SUCCESS('='*50))

