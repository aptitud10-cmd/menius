-- ============================================================
-- BUCCANEER DINER: Uber Eats Category Structure Migration
-- Restaurant ID: a1f5af6a-1805-49d2-b494-f074ac657357
-- 42 categories matching exact Uber Eats structure
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: DISABLE ALL OLD CATEGORIES
-- ============================================================
UPDATE categories
SET is_active = false
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357';

-- ============================================================
-- STEP 2: INSERT 42 NEW CATEGORIES (exact Uber Eats order)
-- ============================================================
INSERT INTO categories (id, restaurant_id, name, sort_order, is_active) VALUES
  -- Breakfast section
  ('c1000001-0000-0000-0000-000000000001','a1f5af6a-1805-49d2-b494-f074ac657357','Juices',1,true),
  ('c1000001-0000-0000-0000-000000000002','a1f5af6a-1805-49d2-b494-f074ac657357','Fruits',2,true),
  ('c1000001-0000-0000-0000-000000000003','a1f5af6a-1805-49d2-b494-f074ac657357','Farm Fresh Eggs',3,true),
  ('c1000001-0000-0000-0000-000000000004','a1f5af6a-1805-49d2-b494-f074ac657357','Egg Omelettes',4,true),
  ('c1000001-0000-0000-0000-000000000005','a1f5af6a-1805-49d2-b494-f074ac657357','3 Egg Specialty Omelettes',5,true),
  ('c1000001-0000-0000-0000-000000000006','a1f5af6a-1805-49d2-b494-f074ac657357','Greek Yogurt',6,true),
  ('c1000001-0000-0000-0000-000000000007','a1f5af6a-1805-49d2-b494-f074ac657357','The Bake Shop',7,true),
  ('c1000001-0000-0000-0000-000000000008','a1f5af6a-1805-49d2-b494-f074ac657357','Cereal',8,true),
  ('c1000001-0000-0000-0000-000000000009','a1f5af6a-1805-49d2-b494-f074ac657357','The Benedict',9,true),
  ('c1000001-0000-0000-0000-000000000010','a1f5af6a-1805-49d2-b494-f074ac657357','Buttermilk Pancakes',10,true),
  ('c1000001-0000-0000-0000-000000000011','a1f5af6a-1805-49d2-b494-f074ac657357','French Toast',11,true),
  ('c1000001-0000-0000-0000-000000000012','a1f5af6a-1805-49d2-b494-f074ac657357','Belgian Waffles',12,true),
  ('c1000001-0000-0000-0000-000000000013','a1f5af6a-1805-49d2-b494-f074ac657357','Hand Rolled Water Bagels',13,true),
  -- Burgers
  ('c1000001-0000-0000-0000-000000000014','a1f5af6a-1805-49d2-b494-f074ac657357','7oz Certified Angus Beef Burgers',14,true),
  ('c1000001-0000-0000-0000-000000000015','a1f5af6a-1805-49d2-b494-f074ac657357','9oz. Specialty Steak Burgers',15,true),
  -- Sandwiches
  ('c1000001-0000-0000-0000-000000000016','a1f5af6a-1805-49d2-b494-f074ac657357','Classic The Carving Board Sandwiches',16,true),
  ('c1000001-0000-0000-0000-000000000017','a1f5af6a-1805-49d2-b494-f074ac657357','Classic Fish Sandwiches',17,true),
  ('c1000001-0000-0000-0000-000000000018','a1f5af6a-1805-49d2-b494-f074ac657357','Classic Egg Sandwiches',18,true),
  ('c1000001-0000-0000-0000-000000000019','a1f5af6a-1805-49d2-b494-f074ac657357','Triple Decker Clubs',19,true),
  -- Sides and Salads
  ('c1000001-0000-0000-0000-000000000020','a1f5af6a-1805-49d2-b494-f074ac657357','Side Orders',20,true),
  ('c1000001-0000-0000-0000-000000000021','a1f5af6a-1805-49d2-b494-f074ac657357','Gourmet Salads',21,true),
  -- More sandwiches
  ('c1000001-0000-0000-0000-000000000022','a1f5af6a-1805-49d2-b494-f074ac657357','Chicken Breast Sandwiches',22,true),
  ('c1000001-0000-0000-0000-000000000023','a1f5af6a-1805-49d2-b494-f074ac657357','Classic Meat Sandwiches',23,true),
  ('c1000001-0000-0000-0000-000000000024','a1f5af6a-1805-49d2-b494-f074ac657357','Classic Cheese Sandwiches',24,true),
  ('c1000001-0000-0000-0000-000000000025','a1f5af6a-1805-49d2-b494-f074ac657357','Signature Sandwiches',25,true),
  ('c1000001-0000-0000-0000-000000000026','a1f5af6a-1805-49d2-b494-f074ac657357','Panini and Wrap Corner',26,true),
  ('c1000001-0000-0000-0000-000000000027','a1f5af6a-1805-49d2-b494-f074ac657357','Hot Open Sandwiches',27,true),
  -- Mains
  ('c1000001-0000-0000-0000-000000000028','a1f5af6a-1805-49d2-b494-f074ac657357','Appetizers',28,true),
  ('c1000001-0000-0000-0000-000000000029','a1f5af6a-1805-49d2-b494-f074ac657357','Entrees',29,true),
  ('c1000001-0000-0000-0000-000000000030','a1f5af6a-1805-49d2-b494-f074ac657357','Greek Corner',30,true),
  ('c1000001-0000-0000-0000-000000000031','a1f5af6a-1805-49d2-b494-f074ac657357','Italian Specialties',31,true),
  ('c1000001-0000-0000-0000-000000000032','a1f5af6a-1805-49d2-b494-f074ac657357','Pasta Specialties',32,true),
  ('c1000001-0000-0000-0000-000000000033','a1f5af6a-1805-49d2-b494-f074ac657357','Signature Dishes',33,true),
  ('c1000001-0000-0000-0000-000000000034','a1f5af6a-1805-49d2-b494-f074ac657357','Seafood',34,true),
  ('c1000001-0000-0000-0000-000000000035','a1f5af6a-1805-49d2-b494-f074ac657357','Sauteed Specialties',35,true),
  ('c1000001-0000-0000-0000-000000000036','a1f5af6a-1805-49d2-b494-f074ac657357','Soups',36,true),
  ('c1000001-0000-0000-0000-000000000037','a1f5af6a-1805-49d2-b494-f074ac657357','Steak and Eggs',37,true),
  ('c1000001-0000-0000-0000-000000000038','a1f5af6a-1805-49d2-b494-f074ac657357','Served on a bed of crisp lettuce with potato salad, coleslaw',38,true),
  -- Drinks & Desserts
  ('c1000001-0000-0000-0000-000000000039','a1f5af6a-1805-49d2-b494-f074ac657357','From the Fountain',39,true),
  ('c1000001-0000-0000-0000-000000000040','a1f5af6a-1805-49d2-b494-f074ac657357','Coffee and Drinks Bar',40,true),
  ('c1000001-0000-0000-0000-000000000041','a1f5af6a-1805-49d2-b494-f074ac657357','Desserts',41,true),
  ('c1000001-0000-0000-0000-000000000042','a1f5af6a-1805-49d2-b494-f074ac657357','Special of the Weeks (Archived)',42,true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 3: REDISTRIBUTE PRODUCTS INTO NEW CATEGORIES
-- ============================================================

-- CAT 01: JUICES (6 products, from Breakfast)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000001'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Apple Juice','Cranberry Juice','Grapefruit Juice',
    'Hawaiian Pineapple Juice','Orange Juice','Tomato or V-8 Juice'
  );

-- CAT 02: FRUITS (4 products, from Breakfast)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000002'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Chilled Half Large Grapefruit','Fresh Berries',
    'Fresh Fruit Salad','Fresh Melon'
  );

-- CAT 03: FARM FRESH EGGS (11 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000003'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Eggs any style',
    'Two Eggs, Any Style',
    'Two Eggs with Canadian Bacon',
    'Two Eggs with Ham, Bacon, Sausage or Turkey Sausage',
    'Two Eggs with Turkey Bacon',
    'Corned Beef Hash & Two Eggs',
    'Chorizo & Eggs',
    '1/2 Romanian Steak with Two Eggs',
    'South of the Border Burrito',
    'Southwestern Burrito',
    'Mexi-Cali Rose Wrap'
  );

-- CAT 04: EGG OMELETTES (7 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000004'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Cheese Omelette',
    'Ham & Cheese Omelette',
    'Ham, Bacon or Sausage Omelette',
    'Fresh Mushroom Omelette',
    'Pastrami or Corned Beef Omelette',
    'Western Omelette',
    'Garden Vegetable Omelette'
  );

-- CAT 05: 3 EGG SPECIALTY OMELETTES (10 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000005'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Avocado Omelette',
    'Chili Con Carne Cheese Omelette',
    'Chorizo Avocado Omelette',
    'Fajita Omelette',
    'Farmers Omelette',
    'Greek Omelette',
    'Low Cholesterol Egg White Omelette',
    'Mediterranean Omelette',
    'Mexican Omelette',
    'Nova Scotia Lox Omelette'
  );

-- CAT 06: GREEK YOGURT (1 product)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000006'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN ('Greek Yogurt with Walnuts & Honey');

-- CAT 07: THE BAKE SHOP (7 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000007'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Buttered Roll',
    'Croissant',
    'Danish Pastry or Apple Turnover',
    'Homemade Muffin',
    'Jumbo English Muffin',
    'Avocado Toast',
    'Avocado Toast with Smoked Salmon'
  );

-- CAT 08: CEREAL (6 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000008'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Assorted Dry Cereals with Milk',
    'Cereal with Raisins',
    'Cereal with Seasonal Berries or Fruit Salad',
    'Old Fashioned Hot Oatmeal with Milk',
    'Oatmeal with Raisins & Brown Sugar',
    'Oatmeal with Seasonal Berries'
  );

-- CAT 09: THE BENEDICT (3 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000009'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Classic Benedict',
    'Crab Cakes Benedict',
    'Smoked Salmon Benedict'
  );

-- CAT 10: BUTTERMILK PANCAKES (17 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000010'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Golden Brown Buttermilk Pancakes',
    'Pancakes',
    'Banana Pecan Pancakes',
    'Banana Pecan Pancakes with Ham, Bacon or Sausage',
    'Banana Pecan Pancakes with Turkey Bacon',
    'Chocolate Chip Pancakes',
    'Coconut Pancakes',
    'Oreo Pancakes',
    'Silver Dollar Pancakes',
    'Silver Dollar Pancakes with Ham, Bacon or Sausage',
    'Healthy Greek Pancakes',
    'Lumberjack',
    'Pancakes with Canadian Bacon or Turkey Bacon',
    'Pancakes with Fresh Fruit or Seasonal Berries',
    'Pancakes with Fresh Fruit, Whipped Cream, Ham, Bacon or Sausage',
    'Pancakes with Ham, Bacon, Sausage or Turkey Sausage',
    'Pancakes with Two Eggs, Any Style'
  );

-- CAT 11: FRENCH TOAST (8 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000011'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Old Fashioned French Toast',
    'Apple Crisp French Toast',
    'Challah Bread French Toast',
    'French Toast Deluxe',
    'French Toast with Canadian Bacon or Turkey Bacon',
    'French Toast with Fresh Fruit or Seasonal Berries & Whipped Cream',
    'French Toast with Ham, Bacon, Sausage or Turkey Sausage',
    'French Toast with Two Eggs, Any Style'
  );

-- CAT 12: BELGIAN WAFFLES (8 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000012'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Belgian Waffle',
    'Belgian Waffle Sundae',
    'Belgian Waffle with Canadian Bacon or Turkey Bacon',
    'Belgian Waffle with Fresh Fruit or Seasonal Berries & Whipped Cream',
    'Belgian Waffle with Ham, Bacon, Sausage or Turkey Sausage',
    'Belgian Waffle with Two Eggs, Any Style',
    'Nutella Waffle',
    'Fried Chicken N'' Waffle'
  );

-- CAT 13: HAND ROLLED WATER BAGELS (6 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000013'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Hand-Rolled Water Bagel',
    'Bagel with Butter',
    'Bagel with Cream Cheese',
    'Bagel with Smoked Salmon',
    'Bagel with Smoked Salmon, Cream Cheese & Onions',
    'The New Yorker Bagel'
  );

-- CAT 14: 7oz CERTIFIED ANGUS BEEF BURGERS (11 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000014'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Beef Burger','Bacon Burger','Bacon Cheeseburger','Cheeseburger',
    'Mushroom Burger','Pizza Burger','Ranch Burger','Texas Burger',
    'Turkey Burger','Veggie Burger','Swiss, Cheddar or Pepper Jack Cheeseburger'
  );

-- CAT 15: 9oz. SPECIALTY STEAK BURGERS (9 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000015'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Alpine Burger','BBQ Burger','Chili Cheeseburger','Cowboy Burger',
    'Mexican Burger','Portobello Burger','Reuben Pastrami Burger',
    'Roadhouse Burger','Western Burger'
  );

-- CAT 16: CLASSIC THE CARVING BOARD SANDWICHES (4 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000016'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Corned Beef or Pastrami Sandwich',
    'Roast Beef Sandwich',
    'Roast Turkey Sandwich',
    'Roast Virginia Ham Sandwich'
  );

-- CAT 17: CLASSIC FISH SANDWICHES (4 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000017'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Fried Filet of Sole Sandwich',
    'Fried Tilapia Filet Sandwich',
    'Shrimp Salad Sandwich',
    'Tuna Fish Salad Sandwich'
  );

-- CAT 18: CLASSIC EGG SANDWICHES (5 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000018'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Fried Eggs (2) Sandwich',
    'Fried Eggs with Canadian Bacon',
    'Fried Eggs with Ham, Bacon or Sausage',
    'Western Egg Sandwich',
    'Daily Made Egg Salad Sandwich'
  );

-- CAT 19: TRIPLE DECKER CLUBS (5 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000019'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Chicken Salad & Bacon Club',
    'Grilled Chicken & Bacon Club',
    'Roast Beef & Swiss Club',
    'Tuna Salad & Sliced Egg Club',
    'Turkey & Bacon Club'
  );

-- CAT 20: SIDE ORDERS (24 products, from Appetizers & Sides)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000020'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Bacon, Sausage, Ham or Turkey Sausage',
    'Baked Potato',
    'Broccoli with Cheese',
    'Cole Slaw or Potato Salad or Apple Sauce',
    'Corned Beef Hash',
    'Cottage Cheese',
    'Disco Fries',
    'Feta Cheese',
    'French Fries',
    'Fried Plantains (Tostones)',
    'Greek Fries',
    'Guacamole',
    'Lettuce & Tomato Salad',
    'Loaded French Fries',
    'Onion Rings',
    'Sliced Avocado',
    'Stuffed Baked Potato with Bacon & Cheese',
    'Stuffed Baked Potato with Broccoli & Cheese',
    'Sweet Potato Fries',
    'Tossed Salad',
    'Turkey Bacon or Canadian Bacon',
    'Tzatziki Dip with Toasted Pita Wedges',
    'Vegetable of the Day',
    'Waffle Fries'
  );

-- CAT 21: GOURMET SALADS (13 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000021'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'BBQ Ranch Chicken Salad',
    'Caesar Salad',
    'Chef''s Salad',
    'Chopped Buffalo Salad',
    'Cobb Salad',
    'Crispy Greens with Salmon',
    'Greek Salad',
    'Mediterranean Salad',
    'Santa Fe Salad',
    'Steak Bistro Salad',
    'Strawberry Fields Salad',
    'Taco Salad',
    'West Coast Grilled Chicken Salad'
  );

-- CAT 22: CHICKEN BREAST SANDWICHES (10 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000022'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Alpine Chicken',
    'American Classic Chicken',
    'Cajun Chicken',
    'California Chicken',
    'Chicken Breast Sandwich',
    'Chicken Cordon Bleu',
    'Grilled Chicken Breast Sandwich',
    'Grilled Chicken Parmigiana Sandwich',
    'Mexicana Chicken',
    'Portobello Chicken'
  ) AND price <= 22.00; -- sandwiches (avoid collision with dinner Chicken Cordon Bleu at $28.95)

-- CAT 23: CLASSIC MEAT SANDWICHES (3 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000023'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'BLT',
    'Boiled Ham Sandwich',
    'Chicken Salad Sandwich'
  );

-- CAT 24: CLASSIC CHEESE SANDWICHES (12 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000024'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'American Cheese Sandwich',
    'Cream Cheese Sandwich',
    'Swiss Cheese (Finlandia) Sandwich',
    'Fresh Mozzarella, Tomato & Basil Pesto',
    'Grilled American Cheese',
    'Grilled Cheese with Bacon or Ham',
    'Grilled Cheese with Tomatoes',
    'Grilled Swiss Cheese',
    'Grilled Swiss with Bacon or Ham',
    'Grilled Swiss with Tomatoes',
    'Ham & American Cheese',
    'Ham & Swiss (Finlandia)'
  );

-- CAT 25: SIGNATURE SANDWICHES (1 product)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000025'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN ('Monte Cristo');

-- CAT 26: PANINI AND WRAP CORNER (13 products: 10 wraps from Sandwiches + 3 breakfast wraps)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000026'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Caesar Wrap',
    'California Chicken Wrap',
    'Chicken Fajita Wrap',
    'Grilled Salmon Wrap',
    'Honey Chicken Wrap',
    'New York Wrap',
    'Omaha Steak Wrap',
    'Philly Steak Wrap',
    'Portobello Wrap',
    'Tijuana Chicken Wrap'
  );

-- CAT 27: HOT OPEN SANDWICHES (2 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000027'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Hot Open Sliced Prime Roast Beef',
    'Hot Open Sliced Turkey'
  );

-- CAT 28: APPETIZERS (15 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000028'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Buffalo Wings',
    'Chicken or Pulled Pork Quesadillas',
    'Chicken Tenders',
    'Clams Casino',
    'Fried Calamari',
    'Guacamole Dip',
    'Jalapeno Poppers',
    'Loaded Nachos Chili Con Carne',
    'Mediterranean Style Spinach Pie',
    'Mini Crab Cakes',
    'Mini Taco',
    'Mozzarella Sticks',
    'Potato Skins',
    'Stuffed Mushrooms or Clams',
    'The Sampler'
  );

-- CAT 29: ENTREES (10 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000029'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Fried Chicken',
    'Chopped Sirloin Steak',
    'Sliced Prime Roast Beef',
    'Roast Virginia Ham',
    'St. Louis BBQ Spare Ribs',
    '2 Thick Cut Jersey Pork Chops',
    'Grilled Breast of Chicken',
    'Mac N'' Cheese',
    'Mac N'' Cheese with Chicken',
    'Mac N'' Cheese with Shrimp'
  );

-- CAT 30: GREEK CORNER (4 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000030'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Chicken Souvlaki',
    'Greek Gyro',
    'Gyro or Souvlaki Sandwich',
    'Spinach Pie Deluxe'
  );

-- CAT 31: ITALIAN SPECIALTIES (3 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000031'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Chicken Cutlet Parmigiana',
    'Eggplant Parmigiana',
    'Fried Shrimp Parmigiana'
  );

-- CAT 32: PASTA SPECIALTIES (13 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000032'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Cheese Ravioli',
    'Fettuccine Alfredo',
    'Frutti Di Mare',
    'Linguine Aglio e Olio',
    'Linguine with Meatballs',
    'Linguine with Tomato Sauce',
    'Meat Ravioli',
    'Pasta Da Vinci',
    'Penne Pasta with Chicken & Shrimp',
    'Penne Pasta with Vodka Sauce',
    'Salmon Saute with Penne Pasta',
    'Fried Calamari with Linguine',
    'Chicken Primavera'
  );

-- CAT 33: SIGNATURE DISHES (1 product)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000033'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN ('Buccaneer Combination');

-- CAT 34: SEAFOOD (24 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000034'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Atlantic Salmon Filet',
    'Crispy Salmon',
    'Deep Sea Scallops',
    'Filet of Sole Broiled',
    'Fisherman''s Platter',
    'Fried Calamari Dinner',
    'Fried Filet of Sole',
    'Fried Jumbo Shrimp (6)',
    'Fried Scallops',
    'Fried Tilapia',
    'Jumbo Shrimp (6) Broiled',
    'Mariner''s Combo',
    'Seafood Combination',
    'Shrimp Francaise',
    'Shrimp Scampi (6)',
    'Stuffed Clams',
    'Stuffed Filet of Sole',
    'Stuffed Salmon Florentine',
    'Stuffed Shrimp',
    'Stuffed Tilapia Filet',
    'Tilapia Filet Broiled',
    'Tilapia Francaise',
    'Twin 5 oz. Rock Lobster Tails',
    'Whole Flounder'
  );

-- CAT 35: SAUTEED SPECIALTIES (5 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000035'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Chicken Breast Saute',
    'Chicken Francaise',
    'Chicken Marsala',
    'Chicken Piccata'
  );
-- Chicken Cordon Bleu dinner version (price > 22 distinguishes it from sandwich)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000035'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name = 'Chicken Cordon Bleu'
  AND price > 22.00;

-- CAT 36: SOUPS (2 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000036'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN ('Chili', 'Soup of the Day');

-- CAT 37: STEAK AND EGGS (8 products)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000037'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'N.Y. Cut Sirloin Steak (approx 16 oz.)',
    'Porterhouse (approx 18-20 oz.)',
    'Romanian Tenderloin Steak',
    'Skirt Steak Tips',
    'Beef & Reef',
    'Sea & Land',
    'Steak & Shrimp Combination',
    'Surf & Turf'
  );

-- CAT 38: SERVED ON A BED OF CRISP LETTUCE (4 products - salad platters)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000038'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Chicken Salad Platter',
    'Shrimp Salad Platter',
    'Tuna Salad Platter',
    'Stuffed California Avocado'
  );

-- CAT 39: FROM THE FOUNTAIN (10 products, from Desserts)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000039'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'Banana Split',
    'Double Rich Milk Shake',
    'Egg Cream',
    'Ice Cream (Two Scoops)',
    'Ice Cream Soda',
    'Milk Shake',
    'Nutella Banana Shake',
    'Oreo Cookie Shake',
    'Sundae with Nuts or Fruit',
    'Sundaes with Whipped Cream'
  );

-- CAT 40: COFFEE AND DRINKS BAR (55 products: all Coffee & Drinks + all Cocktails)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000040'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    -- Coffee & Drinks (23)
    'Assorted Herbal Teas','Assorted Sodas & Diet Sodas','Blue Moon Smoothie',
    'Cafe Latte','Cappuccino','Chocolate Milk','Coffee (Free Refill)',
    'Decaf Tea','Espresso','Frappe (Iced)','Fresh Brewed Decaf Coffee (Free Refill)',
    'Fruit Fusion Smoothie','Hot Chocolate with Whipped Cream','Hot Mochaccino',
    'Iced Coffee or Iced Tea','Lemonade','Milk','Orange Buzz Smoothie',
    'Seltzer Water','Smoothie Colada','Sweet Summer Smoothie','Tea',
    'The Floridian Smoothie',
    -- Cocktails (32)
    'Alabama Slammer','Apricot Sour','Banana Daiquiri','Bay Breeze',
    'Black Russian','Blue Hawaiian','Brandy Alexander','Casa Blanca',
    'Chi-Chi','Fuzzy Navel','Godfather','Golden Cadillac','Kamikaze',
    'L.I. Iced Tea','Melon Ball','Mimosa','Pina Colada','Pineapple Daiquiri',
    'Planter''s Punch','Sea Breeze','Sex on the Beach','Singapore Sling',
    'Sloe Gin Fizz','Strawberry Daiquiri','Toasted Almond','Tom Collins',
    'Virgin Daiquiri','Virgin Pina Colada','Whiskey Sour','White Russian',
    'Woo Woo','Zombie'
  );

-- CAT 41: DESSERTS (19 products, remaining from Desserts after Fountain items split off)
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000041'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name IN (
    'All Pound Cakes',
    'Apple Crumb Pie',
    'Apple Pie',
    'Brownie All The Way',
    'Brownies',
    'Carrot Cake',
    'Chocolate Cheesecake',
    'Chocolate Chip Cookies',
    'Chocolate Layer Cake',
    'Chocolate Mousse',
    'Coconut Lemon Layer Cake',
    'Fruit Cheesecake',
    'Greek Pastries',
    'Jello with Fruit Cocktail',
    'Lemon Meringue Pie',
    'Plain Cheesecake - NY Style',
    'Rice Pudding',
    'Strawberry Short Cake'
  );
-- Danish Pastry or Apple Turnover: dessert version ($4.25) stays in desserts
-- But the one already moved to Bake Shop ($4.15) is different.
-- Both have same name; the one in Desserts category was $4.25
-- The UPDATE for Bake Shop used exact name match - the one still in old Desserts cat will be caught here:
UPDATE products SET category_id = 'c1000001-0000-0000-0000-000000000041'
WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
  AND name = 'Danish Pastry or Apple Turnover'
  AND category_id NOT IN ('c1000001-0000-0000-0000-000000000007'); -- not the Bake Shop one

-- CAT 42: SPECIAL OF THE WEEKS ARCHIVED (0 products currently)
-- No products to move - already empty

-- ============================================================
-- STEP 4: ADD MODIFIER GROUPS TO KEY PRODUCTS
-- Using PL/pgSQL DO block for batch processing
-- ============================================================

DO $$
DECLARE
  _product_id UUID;
  _group_id UUID;
BEGIN

  -- ===========================================================
  -- A) EGG STYLE + TOAST + POTATOES for FARM FRESH EGGS (cat 03)
  -- ===========================================================
  FOR _product_id IN
    SELECT id FROM products
    WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
      AND category_id = 'c1000001-0000-0000-0000-000000000003'
      AND NOT EXISTS (
        SELECT 1 FROM modifier_groups mg
        WHERE mg.product_id = products.id AND mg.name = 'Egg Style'
      )
  LOOP
    -- Egg Style (required)
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Egg Style', 'single', 1, 1, true, 1);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Sunny Side Up',  0, true,  1),
      (gen_random_uuid(), _group_id, 'Over Easy',      0, false, 2),
      (gen_random_uuid(), _group_id, 'Over Medium',    0, false, 3),
      (gen_random_uuid(), _group_id, 'Over Hard',      0, false, 4),
      (gen_random_uuid(), _group_id, 'Scrambled',      0, false, 5),
      (gen_random_uuid(), _group_id, 'Poached',        0, false, 6);

    -- Toast (optional)
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Toast', 'single', 0, 1, false, 2);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'White Toast',    0,    true,  1),
      (gen_random_uuid(), _group_id, 'Whole Wheat',    0,    false, 2),
      (gen_random_uuid(), _group_id, 'Rye',            0,    false, 3),
      (gen_random_uuid(), _group_id, '7 Grain',        0,    false, 4),
      (gen_random_uuid(), _group_id, 'Bagel',          0.50, false, 5),
      (gen_random_uuid(), _group_id, 'English Muffin', 0.50, false, 6);

    -- Potatoes (optional)
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Potatoes', 'single', 0, 1, false, 3);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Home Fries',   0, true,  1),
      (gen_random_uuid(), _group_id, 'French Fries', 0, false, 2),
      (gen_random_uuid(), _group_id, 'Mashed',       0, false, 3),
      (gen_random_uuid(), _group_id, 'Baked Potato', 0, false, 4);

  END LOOP;

  -- ===========================================================
  -- B) TOAST + POTATOES for EGG OMELETTES (cat 04) and 3 EGG SPECIALTY (cat 05)
  -- ===========================================================
  FOR _product_id IN
    SELECT id FROM products
    WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
      AND category_id IN (
        'c1000001-0000-0000-0000-000000000004',
        'c1000001-0000-0000-0000-000000000005'
      )
      AND NOT EXISTS (
        SELECT 1 FROM modifier_groups mg
        WHERE mg.product_id = products.id AND mg.name = 'Toast'
      )
  LOOP
    -- Toast (optional)
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Toast', 'single', 0, 1, false, 1);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'White Toast',    0,    true,  1),
      (gen_random_uuid(), _group_id, 'Whole Wheat',    0,    false, 2),
      (gen_random_uuid(), _group_id, 'Rye',            0,    false, 3),
      (gen_random_uuid(), _group_id, '7 Grain',        0,    false, 4),
      (gen_random_uuid(), _group_id, 'Bagel',          0.50, false, 5),
      (gen_random_uuid(), _group_id, 'English Muffin', 0.50, false, 6);

    -- Potatoes (optional)
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Potatoes', 'single', 0, 1, false, 2);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Home Fries',   0, true,  1),
      (gen_random_uuid(), _group_id, 'French Fries', 0, false, 2),
      (gen_random_uuid(), _group_id, 'Mashed',       0, false, 3),
      (gen_random_uuid(), _group_id, 'Baked Potato', 0, false, 4);

  END LOOP;

  -- ===========================================================
  -- C) STYLE (Regular / Deluxe) + COOKING TEMP for BURGERS
  --    7oz (cat 14) and 9oz (cat 15)
  -- ===========================================================
  FOR _product_id IN
    SELECT id FROM products
    WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
      AND category_id IN (
        'c1000001-0000-0000-0000-000000000014',
        'c1000001-0000-0000-0000-000000000015'
      )
      AND NOT EXISTS (
        SELECT 1 FROM modifier_groups mg
        WHERE mg.product_id = products.id AND mg.name = 'Style'
      )
  LOOP
    -- Style: Regular vs Deluxe (includes fries & coleslaw)
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Style', 'single', 1, 1, true, 1);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Regular',            0, true,  1),
      (gen_random_uuid(), _group_id, 'Deluxe (w/ Fries & Coleslaw)', 5.00, false, 2);

    -- Cooking Temperature
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Cooking Temperature', 'single', 1, 1, true, 2);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Rare',        0, false, 1),
      (gen_random_uuid(), _group_id, 'Medium Rare', 0, true,  2),
      (gen_random_uuid(), _group_id, 'Medium',      0, false, 3),
      (gen_random_uuid(), _group_id, 'Medium Well', 0, false, 4),
      (gen_random_uuid(), _group_id, 'Well Done',   0, false, 5);

    -- Add Cheese (optional)
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Add Cheese', 'single', 0, 1, false, 3);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'American',    1.50, false, 1),
      (gen_random_uuid(), _group_id, 'Cheddar',     1.50, false, 2),
      (gen_random_uuid(), _group_id, 'Swiss',       1.50, false, 3),
      (gen_random_uuid(), _group_id, 'Mozzarella',  1.50, false, 4),
      (gen_random_uuid(), _group_id, 'Pepperjack',  1.50, false, 5),
      (gen_random_uuid(), _group_id, 'Feta',        1.50, false, 6);

  END LOOP;

  -- ===========================================================
  -- D) SIZE for JUICES (cat 01)
  -- ===========================================================
  FOR _product_id IN
    SELECT id FROM products
    WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
      AND category_id = 'c1000001-0000-0000-0000-000000000001'
      AND NOT EXISTS (
        SELECT 1 FROM modifier_groups mg
        WHERE mg.product_id = products.id AND mg.name = 'Size'
      )
  LOOP
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Size', 'single', 1, 1, true, 1);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Medium', 0,    true,  1),
      (gen_random_uuid(), _group_id, 'Large',  0.60, false, 2);
  END LOOP;

  -- ===========================================================
  -- E) BREAD CHOICE for CARVING BOARD SANDWICHES (cat 16)
  --    and CLASSIC MEAT SANDWICHES (cat 23)
  -- ===========================================================
  FOR _product_id IN
    SELECT id FROM products
    WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
      AND category_id IN (
        'c1000001-0000-0000-0000-000000000016',
        'c1000001-0000-0000-0000-000000000023'
      )
      AND NOT EXISTS (
        SELECT 1 FROM modifier_groups mg
        WHERE mg.product_id = products.id AND mg.name = 'Bread'
      )
  LOOP
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Bread', 'single', 1, 1, true, 1);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'White',       0, true,  1),
      (gen_random_uuid(), _group_id, 'Whole Wheat', 0, false, 2),
      (gen_random_uuid(), _group_id, 'Rye',         0, false, 3),
      (gen_random_uuid(), _group_id, 'Roll',        0, false, 4),
      (gen_random_uuid(), _group_id, 'Hero',        0, false, 5),
      (gen_random_uuid(), _group_id, 'Wrap',        0, false, 6);

    -- Style: Regular vs Deluxe
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Style', 'single', 1, 1, true, 2);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Regular',            0,    true,  1),
      (gen_random_uuid(), _group_id, 'Deluxe (w/ Fries & Coleslaw)', 5.00, false, 2);
  END LOOP;

  -- ===========================================================
  -- F) COOKING TEMPERATURE for STEAK AND EGGS (cat 37)
  -- ===========================================================
  FOR _product_id IN
    SELECT id FROM products
    WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
      AND category_id = 'c1000001-0000-0000-0000-000000000037'
      AND NOT EXISTS (
        SELECT 1 FROM modifier_groups mg
        WHERE mg.product_id = products.id AND mg.name = 'Cooking Temperature'
      )
  LOOP
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Cooking Temperature', 'single', 1, 1, true, 1);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Rare',        0, false, 1),
      (gen_random_uuid(), _group_id, 'Medium Rare', 0, true,  2),
      (gen_random_uuid(), _group_id, 'Medium',      0, false, 3),
      (gen_random_uuid(), _group_id, 'Medium Well', 0, false, 4),
      (gen_random_uuid(), _group_id, 'Well Done',   0, false, 5);

    -- Egg Style for Steak & Eggs combos
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Egg Style', 'single', 1, 1, true, 2);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Sunny Side Up', 0, true,  1),
      (gen_random_uuid(), _group_id, 'Over Easy',     0, false, 2),
      (gen_random_uuid(), _group_id, 'Over Medium',   0, false, 3),
      (gen_random_uuid(), _group_id, 'Over Hard',     0, false, 4),
      (gen_random_uuid(), _group_id, 'Scrambled',     0, false, 5);

    -- Potatoes
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Potatoes', 'single', 0, 1, false, 3);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Home Fries',   0, true,  1),
      (gen_random_uuid(), _group_id, 'French Fries', 0, false, 2),
      (gen_random_uuid(), _group_id, 'Mashed',       0, false, 3),
      (gen_random_uuid(), _group_id, 'Baked Potato', 0, false, 4);
  END LOOP;

  -- ===========================================================
  -- G) DRESSING for GOURMET SALADS (cat 21)
  -- ===========================================================
  FOR _product_id IN
    SELECT id FROM products
    WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
      AND category_id = 'c1000001-0000-0000-0000-000000000021'
      AND NOT EXISTS (
        SELECT 1 FROM modifier_groups mg
        WHERE mg.product_id = products.id AND mg.name = 'Dressing'
      )
  LOOP
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Dressing', 'single', 1, 1, true, 1);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Balsamic Vinaigrette', 0, true,  1),
      (gen_random_uuid(), _group_id, 'Caesar',               0, false, 2),
      (gen_random_uuid(), _group_id, 'Ranch',                0, false, 3),
      (gen_random_uuid(), _group_id, 'Blue Cheese',          0, false, 4),
      (gen_random_uuid(), _group_id, 'Honey Mustard',        0, false, 5),
      (gen_random_uuid(), _group_id, 'Thousand Island',      0, false, 6),
      (gen_random_uuid(), _group_id, 'Oil & Vinegar',        0, false, 7),
      (gen_random_uuid(), _group_id, 'On the Side',          0, false, 8);
  END LOOP;

  -- ===========================================================
  -- H) SIZE for SOUPS (cat 36)
  -- ===========================================================
  FOR _product_id IN
    SELECT id FROM products
    WHERE restaurant_id = 'a1f5af6a-1805-49d2-b494-f074ac657357'
      AND category_id = 'c1000001-0000-0000-0000-000000000036'
      AND NOT EXISTS (
        SELECT 1 FROM modifier_groups mg
        WHERE mg.product_id = products.id AND mg.name = 'Size'
      )
  LOOP
    _group_id := gen_random_uuid();
    INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
    VALUES (_group_id, _product_id, 'Size', 'single', 1, 1, true, 1);
    INSERT INTO modifier_options (id, group_id, name, price_delta, is_default, sort_order) VALUES
      (gen_random_uuid(), _group_id, 'Cup',  0,    true,  1),
      (gen_random_uuid(), _group_id, 'Bowl', 2.00, false, 2);
  END LOOP;

END $$;

COMMIT;
