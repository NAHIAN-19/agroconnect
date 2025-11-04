# Seeding Products Database

## Management Command

A Django management command has been created to seed the database with demo product data.

### Usage

```bash
# Seed products (creates new ones, updates existing)
python manage.py seed_products

# Clear existing products and seed fresh data
python manage.py seed_products --clear
```

### What it creates:

1. **4 Sellers** (if they don't exist):
   - Green Valley Farm
   - Sunrise Agriculture
   - Nature's Best Farm
   - Tropical Farm

2. **6 Products**:
   - Fresh Organic Tomatoes (Green Valley Farm)
   - Farm Fresh Potatoes (Sunrise Agriculture)
   - Organic Green Beans (Nature's Best Farm)
   - Fresh Mangoes (Tropical Farm)
   - Organic Red Onions (Green Valley Farm)
   - Fresh Cauliflower (Sunrise Agriculture)

3. **1 Buyer** (for reviews):
   - Fresh Market Co.

4. **2 Reviews** (for products):
   - Review for Fresh Organic Tomatoes
   - Review for Farm Fresh Potatoes

### Notes:

- The command is idempotent: running it multiple times won't create duplicates
- It uses `get_or_create` to avoid duplicates
- Sellers are created with verified status and completed profiles
- Products are created with verified status matching seller verification

### After Seeding:

Once you've run the seed command, the frontend will automatically load products from the database via the API endpoints.

