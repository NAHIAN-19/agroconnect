from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random

from django.contrib.auth import get_user_model
from apps.products.models import Product
from apps.orders.models import Order, OrderItem

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds the database with initial demo orders data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing demo orders before seeding.',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting orders seeding...'))

        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing demo orders...'))
            Order.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing demo orders cleared.'))

        # Get or create demo users
        try:
            buyers = User.objects.filter(role='BUYER')[:5]
            sellers = User.objects.filter(role='SELLER')
            
            if not buyers.exists():
                self.stdout.write(self.style.ERROR('No buyers found. Please run seed_products first to create demo users.'))
                return
            
            if not sellers.exists():
                self.stdout.write(self.style.ERROR('No sellers found. Please run seed_products first to create sellers.'))
                return
            
            # Get active products
            products = Product.objects.filter(is_active=True)[:20]
            
            if products.count() < 3:
                self.stdout.write(self.style.ERROR('Not enough products found. Please run seed_products first.'))
                return
            
            # Create demo orders
            orders_created = 0
            statuses = [
                Order.StatusChoices.PENDING,
                Order.StatusChoices.PAID,
                Order.StatusChoices.PROCESSING,
                Order.StatusChoices.SHIPPED,
                Order.StatusChoices.DELIVERED,
            ]
            
            payment_methods = [
                Order.PAYMENT_METHOD_SSLCOMMERZ,
                Order.PAYMENT_METHOD_CASH_ON_DELIVERY,
            ]
            
            # Sample delivery addresses in Bangladesh
            cities = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna']
            areas = {
                'Dhaka': ['Gulshan', 'Dhanmondi', 'Banani', 'Mohakhali', 'Uttara'],
                'Chittagong': ['Agrabad', 'Halishahar', 'Nasirabad', 'Pahartali'],
                'Sylhet': ['Dargah Gate', 'Subhanighat', 'Zindabazar'],
                'Rajshahi': ['Shaheb Bazar', 'Motihar', 'Kazihata'],
                'Khulna': ['Sonadanga', 'Daulatpur', 'Khalishpur'],
            }
            
            # Create 15-20 orders
            for i in range(15):
                buyer = random.choice(buyers)
                status = random.choice(statuses)
                payment_method = random.choice(payment_methods)
                
                # Select 1-3 random products (not from same seller as buyer if buyer is also seller)
                available_products = list(products)
                if buyer.role == 'SELLER':
                    available_products = [p for p in available_products if p.seller_id != buyer.id]
                
                if not available_products:
                    continue
                
                num_items = random.randint(1, 3)
                selected_products = random.sample(available_products, min(num_items, len(available_products)))
                
                # Calculate amounts
                subtotal = sum(p.price * random.randint(1, 5) for p in selected_products)
                delivery_fee = 50.00
                total_amount = subtotal + int(delivery_fee)
                
                # Generate recipient info
                city = random.choice(cities)
                area = random.choice(areas.get(city, ['Central']))
                
                # Create order
                order = Order.objects.create(
                    buyer=buyer,
                    subtotal=subtotal,
                    delivery_fee=delivery_fee,
                    total_amount=total_amount,
                    status=status,
                    payment_method=payment_method,
                    payment_status='success' if status != Order.StatusChoices.PENDING else 'pending',
                    recipient_name=f"{buyer.first_name} {buyer.last_name}",
                    recipient_phone=buyer.phone_number or f"017{random.randint(10000000, 99999999)}",
                    recipient_address=f"{random.randint(1, 999)} {random.choice(['Main Road', 'Street', 'Lane'])}",
                    recipient_city=city,
                    recipient_area=area,
                    recipient_postcode=f"{random.randint(1000, 9999)}",
                )
                
                # Set timestamps based on status
                days_ago = random.randint(1, 30)
                order.created_at = timezone.now() - timedelta(days=days_ago)
                
                if status in [Order.StatusChoices.SHIPPED, Order.StatusChoices.DELIVERED]:
                    order.shipped_at = order.created_at + timedelta(days=random.randint(1, 3))
                    order.shipping_status = 'in_transit'
                    order.redx_tracking_number = f"RDX{order.id:06d}{order.order_number[-3:]}"
                    
                    if status == Order.StatusChoices.DELIVERED:
                        order.delivered_at = order.shipped_at + timedelta(days=random.randint(1, 3))
                        order.shipping_status = 'delivered'
                        order.payment_status = 'success'
                
                if payment_method == Order.PAYMENT_METHOD_SSLCOMMERZ and status != Order.StatusChoices.PENDING:
                    order.sslcommerz_tran_id = f"TXN{order.id:08d}"
                    order.sslcommerz_val_id = f"VAL{order.id:08d}"
                    order.payment_date = order.created_at + timedelta(hours=random.randint(1, 24))
                
                order.save()
                
                # Create order items
                for product in selected_products:
                    quantity = random.randint(1, 5)
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=quantity,
                        unit_price=product.price,
                        total_price=product.price * quantity,
                    )
                    
                    # Don't actually reduce stock for demo data
                    # In production, stock is reduced in OrderCreateSerializer
                
                orders_created += 1
            
            self.stdout.write(self.style.SUCCESS(
                f'Successfully created {orders_created} demo orders!'
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error seeding orders: {str(e)}'))
            import traceback
            traceback.print_exc()

