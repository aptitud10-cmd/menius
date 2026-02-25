-- ============================================================
-- BUCCANEER DINER — Full Menu Seed
-- Restaurant ID: a1f5af6a-1805-49d2-b494-f074ac657357
--
-- Run this in the Supabase SQL Editor.
-- It deletes ALL existing seed data for this restaurant
-- and inserts the complete real menu (~250+ products).
-- ============================================================

DO $$
DECLARE
  rid UUID := 'a1f5af6a-1805-49d2-b494-f074ac657357';
  -- Category IDs
  c_juices UUID;
  c_eggs UUID;
  c_omelettes UUID;
  c_benedicts UUID;
  c_pancakes UUID;
  c_frenchtoast UUID;
  c_waffles UUID;
  c_bakery UUID;
  c_bwraps UUID;
  c_burgers UUID;
  c_sandwiches UUID;
  c_chickensand UUID;
  c_panini UUID;
  c_soups UUID;
  c_appetizers UUID;
  c_entrees UUID;
  c_seafood UUID;
  c_italian UUID;
  c_greek UUID;
  c_signature UUID;
  c_sides UUID;
  c_cocktails UUID;
  c_smoothies UUID;
  c_coffee UUID;
  c_desserts UUID;
  c_icecream UUID;
  -- Product IDs for variants/extras
  pid UUID;
BEGIN

-- ════════════════════════════════════════
-- 1. DELETE existing data
-- ════════════════════════════════════════
DELETE FROM order_item_modifiers WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = rid));
DELETE FROM order_item_extras WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = rid));
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = rid);
DELETE FROM modifier_options WHERE group_id IN (SELECT mg.id FROM modifier_groups mg JOIN products p ON mg.product_id = p.id WHERE p.restaurant_id = rid);
DELETE FROM modifier_groups WHERE product_id IN (SELECT id FROM products WHERE restaurant_id = rid);
DELETE FROM product_extras WHERE product_id IN (SELECT id FROM products WHERE restaurant_id = rid);
DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE restaurant_id = rid);
DELETE FROM products WHERE restaurant_id = rid;
DELETE FROM categories WHERE restaurant_id = rid;

-- ════════════════════════════════════════
-- 2. CATEGORIES
-- ════════════════════════════════════════
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Juices & Fruits',1,true) RETURNING id INTO c_juices;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Farm Fresh Eggs',2,true) RETURNING id INTO c_eggs;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Omelettes',3,true) RETURNING id INTO c_omelettes;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Benedicts & Brunch',4,true) RETURNING id INTO c_benedicts;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Pancakes',5,true) RETURNING id INTO c_pancakes;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'French Toast',6,true) RETURNING id INTO c_frenchtoast;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Waffles',7,true) RETURNING id INTO c_waffles;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Bagels & Bakery',8,true) RETURNING id INTO c_bakery;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Breakfast Wraps',9,true) RETURNING id INTO c_bwraps;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Burgers',10,true) RETURNING id INTO c_burgers;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Sandwiches',11,true) RETURNING id INTO c_sandwiches;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Chicken Sandwiches',12,true) RETURNING id INTO c_chickensand;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Panini & Wraps',13,true) RETURNING id INTO c_panini;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Soups & Salads',14,true) RETURNING id INTO c_soups;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Appetizers',15,true) RETURNING id INTO c_appetizers;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Entrees & Steaks',16,true) RETURNING id INTO c_entrees;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Seafood',17,true) RETURNING id INTO c_seafood;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Italian & Pasta',18,true) RETURNING id INTO c_italian;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Greek Corner',19,true) RETURNING id INTO c_greek;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Signature Dishes',20,true) RETURNING id INTO c_signature;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Side Orders',21,true) RETURNING id INTO c_sides;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Cocktails',22,true) RETURNING id INTO c_cocktails;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Smoothies & Beverages',23,true) RETURNING id INTO c_smoothies;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Coffee & Hot Drinks',24,true) RETURNING id INTO c_coffee;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Desserts',25,true) RETURNING id INTO c_desserts;
INSERT INTO categories (id,restaurant_id,name,sort_order,is_active) VALUES (gen_random_uuid(),rid,'Ice Cream & Fountain',26,true) RETURNING id INTO c_icecream;

-- ════════════════════════════════════════
-- 3. PRODUCTS — JUICES & FRUITS
-- ════════════════════════════════════════
-- Juices with Med/Lg variants
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_juices,'Orange Juice','Freshly squeezed orange juice',4.35,true,1) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Medium',0,1),(pid,'Large',0.60,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_juices,'Grapefruit Juice','Fresh grapefruit juice',4.35,true,2) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Medium',0,1),(pid,'Large',0.60,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_juices,'Apple Juice','Crisp apple juice',4.35,true,3) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Medium',0,1),(pid,'Large',0.60,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_juices,'Tomato or V-8 Juice','Classic tomato or V-8 vegetable juice',4.35,true,4) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Medium',0,1),(pid,'Large',0.60,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_juices,'Hawaiian Pineapple Juice','Tropical pineapple juice',4.35,true,5) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Medium',0,1),(pid,'Large',0.60,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_juices,'Cranberry Juice','Tart cranberry juice',4.35,true,6) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Medium',0,1),(pid,'Large',0.60,2);
-- Fruits
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_juices,'Fresh Fruit Salad','Seasonal mixed fruit salad',5.95,true,7),
(rid,c_juices,'Chilled Half Large Grapefruit','Chilled half grapefruit served cold',4.95,true,8),
(rid,c_juices,'Fresh Melon','Seasonal fresh melon slices',4.95,true,9),
(rid,c_juices,'Fresh Berries','Seasonal fresh berries',4.95,true,10);

-- ════════════════════════════════════════
-- 4. PRODUCTS — FARM FRESH EGGS
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_eggs,'Two Eggs, Any Style','Two eggs any style served with home fries and toast',8.65,true,1),
(rid,c_eggs,'Two Eggs with Ham, Bacon, Sausage or Turkey Sausage','Two eggs any style with choice of ham, bacon, sausage or turkey sausage, home fries and toast',11.65,true,2),
(rid,c_eggs,'Two Eggs with Turkey Bacon','Two eggs any style with turkey bacon, home fries and toast',12.65,true,3),
(rid,c_eggs,'Two Eggs with Canadian Bacon','Two eggs any style with Canadian bacon, home fries and toast',12.65,true,4),
(rid,c_eggs,'Corned Beef Hash & Two Eggs','House-made corned beef hash with two eggs any style, home fries and toast',13.65,true,5);

-- ════════════════════════════════════════
-- 5. PRODUCTS — OMELETTES
-- ════════════════════════════════════════
-- Standard omelettes (served with home fries and toast)
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(gen_random_uuid(),rid,c_omelettes,'Cheese Omelette','Choice of American or Swiss cheese, served with home fries and toast',12.95,true,1);
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_omelettes,'Pastrami or Corned Beef Omelette','Tender pastrami or corned beef omelette with home fries and toast',13.95,true,2),
(rid,c_omelettes,'Ham, Bacon or Sausage Omelette','Choice of ham, bacon or sausage omelette with home fries and toast',13.95,true,3),
(rid,c_omelettes,'Ham & Cheese Omelette','Ham and cheese omelette with home fries and toast',13.95,true,4),
(rid,c_omelettes,'Western Omelette','Ham, peppers and onions, served with home fries and toast',13.95,true,5),
(rid,c_omelettes,'Fresh Mushroom Omelette','Sauteed fresh mushrooms, served with home fries and toast',13.95,true,6),
(rid,c_omelettes,'Garden Vegetable Omelette','Choice of two fresh vegetables, served with home fries and toast',13.95,true,7),
(rid,c_omelettes,'Nova Scotia Lox Omelette','Farm fresh eggs with smoked salmon and caramelized onions, can be scrambled, served with toasted bagel',15.95,true,8);
-- 3 Egg Specialty Omelettes
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_omelettes,'Mediterranean Omelette','Peppers, onions, ham and choice of cheese, topped with salsa',15.95,true,9),
(rid,c_omelettes,'Fajita Omelette','Chicken, peppers, onions and cheddar cheese',15.95,true,10),
(rid,c_omelettes,'Mexican Omelette','Jalapeno peppers, onions and cheddar cheese, topped with salsa',15.95,true,11),
(rid,c_omelettes,'Farmers Omelette','Sausage, ham, potatoes and cheese mixed together',15.95,true,12),
(rid,c_omelettes,'Chorizo Avocado Omelette','Chorizo sausage, avocado, peppers, onions, salsa, cilantro and pepper jack cheese, topped with sour cream',15.95,true,13),
(rid,c_omelettes,'Avocado Omelette','Bacon, cheddar cheese and onions',15.95,true,14),
(rid,c_omelettes,'Greek Omelette','Feta cheese and tomato',15.95,true,15),
(rid,c_omelettes,'Low Cholesterol Egg White Omelette','Egg whites with peppers, onions, mushrooms, tomatoes and pesto sauce',15.95,true,16),
(rid,c_omelettes,'Chili Con Carne Cheese Omelette','Peppers, onions, chili con carne, topped with pepper jack cheddar cheese and salsa',15.95,true,17);

-- ════════════════════════════════════════
-- 6. PRODUCTS — BENEDICTS & BRUNCH
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_benedicts,'Classic Benedict','Poached eggs with Canadian bacon on toasted English muffin with hollandaise sauce, served with home fries',15.95,true,1),
(rid,c_benedicts,'Smoked Salmon Benedict','Poached eggs with smoked salmon on toasted English muffin with hollandaise sauce, served with home fries',17.95,true,2),
(rid,c_benedicts,'Crab Cakes Benedict','Poached eggs with crab cakes and chipotle hollandaise sauce, served with home fries',17.95,true,3),
(rid,c_benedicts,'1/2 Romanian Steak with Two Eggs','Half Romanian steak with two eggs any style, served with home fries and toast',30.95,true,4),
(rid,c_benedicts,'Avocado Toast','Toasted seven grain bread, smashed avocado, chopped tomatoes, diced onions, cilantro, poached eggs and house salad',14.95,true,5),
(rid,c_benedicts,'Avocado Toast with Smoked Salmon','Toasted seven grain bread, smashed avocado, chopped tomatoes, diced onions, cilantro, poached eggs and house salad with smoked salmon',18.95,true,6);
-- Greek Yogurt
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_benedicts,'Greek Yogurt with Walnuts & Honey','Creamy Fage Greek yogurt topped with walnuts and honey',9.95,true,7) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'With Walnuts & Honey',0,1),(pid,'With Fresh Fruit or Seasonal Berries',1.00,2),(pid,'With Homemade Granola & Honey',0,3),(pid,'With Granola, Honey & Seasonal Berries',2.00,4);

-- ════════════════════════════════════════
-- 7. PRODUCTS — PANCAKES
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_pancakes,'Golden Brown Buttermilk Pancakes','Fluffy buttermilk pancakes served with butter and syrup',11.75,true,1),
(rid,c_pancakes,'Pancakes with Ham, Bacon, Sausage or Turkey Sausage','Buttermilk pancakes with choice of meat',14.75,true,2),
(rid,c_pancakes,'Pancakes with Canadian Bacon or Turkey Bacon','Buttermilk pancakes with Canadian bacon or turkey bacon',15.75,true,3),
(rid,c_pancakes,'Pancakes with Two Eggs, Any Style','Buttermilk pancakes with two eggs any style',13.75,true,4),
(rid,c_pancakes,'Silver Dollar Pancakes','Mini silver dollar pancakes served with butter and syrup',12.75,true,5),
(rid,c_pancakes,'Silver Dollar Pancakes with Ham, Bacon or Sausage','Mini silver dollar pancakes with choice of meat',15.75,true,6),
(rid,c_pancakes,'Pancakes with Fresh Fruit or Seasonal Berries','Buttermilk pancakes topped with fresh fruit or seasonal berries',14.75,true,7),
(rid,c_pancakes,'Pancakes with Fresh Fruit, Whipped Cream, Ham, Bacon or Sausage','Buttermilk pancakes loaded with fruit, whipped cream and choice of meat',16.75,true,8),
(rid,c_pancakes,'Banana Pecan Pancakes','Buttermilk pancakes with bananas and pecans',14.75,true,9),
(rid,c_pancakes,'Banana Pecan Pancakes with Ham, Bacon or Sausage','Banana pecan pancakes with choice of meat',16.75,true,10),
(rid,c_pancakes,'Banana Pecan Pancakes with Turkey Bacon','Banana pecan pancakes with turkey bacon',17.75,true,11),
(rid,c_pancakes,'Chocolate Chip Pancakes','Buttermilk pancakes with chocolate chips',13.75,true,12),
(rid,c_pancakes,'Coconut Pancakes','Buttermilk pancakes served with rum-infused pina colada syrup',13.75,true,13),
(rid,c_pancakes,'Lumberjack','Three pancakes with bacon (2), ham (1), sausage (1) and two eggs your way',17.75,true,14),
(rid,c_pancakes,'Oreo Pancakes','Buttermilk pancakes with crushed Oreo cookies',13.75,true,15),
(rid,c_pancakes,'Healthy Greek Pancakes','Buttermilk pancakes with Greek yogurt, strawberries and pecans, drizzled with honey',17.95,true,16);

-- ════════════════════════════════════════
-- 8. PRODUCTS — FRENCH TOAST
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_frenchtoast,'Old Fashioned French Toast','Thin sliced brioche (3 slices) served with butter and syrup',11.75,true,1),
(rid,c_frenchtoast,'Challah Bread French Toast','Thick-cut challah bread French toast with butter and syrup',11.75,true,2),
(rid,c_frenchtoast,'French Toast with Ham, Bacon, Sausage or Turkey Sausage','French toast with choice of meat',14.75,true,3),
(rid,c_frenchtoast,'French Toast with Canadian Bacon or Turkey Bacon','French toast with Canadian bacon or turkey bacon',15.75,true,4),
(rid,c_frenchtoast,'French Toast with Two Eggs, Any Style','French toast with two eggs cooked your way',13.75,true,5),
(rid,c_frenchtoast,'French Toast with Fresh Fruit or Seasonal Berries & Whipped Cream','French toast topped with fresh fruit or berries and whipped cream',14.75,true,6),
(rid,c_frenchtoast,'French Toast Deluxe','French toast with bacon (2), ham (1), sausage (1) and two eggs your way',17.75,true,7),
(rid,c_frenchtoast,'Apple Crisp French Toast','Sauteed sliced apples, raisins, brown sugar and bourbon-infused apple cider sauce stuffed between 3 slices of brioche French toast, topped with crumb cake and whipped cream, finished with homemade creamy caramel sauce',16.95,true,8);

-- ════════════════════════════════════════
-- 9. PRODUCTS — WAFFLES
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_waffles,'Belgian Waffle','Golden Belgian waffle served with butter and syrup',11.95,true,1),
(rid,c_waffles,'Belgian Waffle with Ham, Bacon, Sausage or Turkey Sausage','Belgian waffle with choice of meat',14.95,true,2),
(rid,c_waffles,'Belgian Waffle with Canadian Bacon or Turkey Bacon','Belgian waffle with Canadian bacon or turkey bacon',15.95,true,3),
(rid,c_waffles,'Belgian Waffle with Two Eggs, Any Style','Belgian waffle with two eggs cooked your way',14.65,true,4),
(rid,c_waffles,'Belgian Waffle with Fresh Fruit or Seasonal Berries & Whipped Cream','Belgian waffle topped with fresh fruit or berries and whipped cream',14.65,true,5),
(rid,c_waffles,'Fried Chicken N'' Waffle','Crispy fried chicken tenders served on a Belgian waffle with syrup',17.95,true,6),
(rid,c_waffles,'Nutella Waffle','Belgian waffle stuffed with Nutella, strawberries, bananas and blueberries',16.95,true,7),
(rid,c_waffles,'Belgian Waffle Sundae','Belgian waffle topped with one scoop of ice cream, walnuts, whipped cream and chocolate syrup',16.95,true,8);

-- ════════════════════════════════════════
-- 10. PRODUCTS — BAGELS & BAKERY
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_bakery,'Hand-Rolled Water Bagel','Fresh hand-rolled water bagel, plain',2.75,true,1),
(rid,c_bakery,'Bagel with Butter','Hand-rolled water bagel with butter',4.25,true,2),
(rid,c_bakery,'Bagel with Cream Cheese','Hand-rolled water bagel with cream cheese',13.65,true,3),
(rid,c_bakery,'Bagel with Smoked Salmon','Hand-rolled water bagel with smoked salmon',14.65,true,4),
(rid,c_bakery,'Bagel with Smoked Salmon, Cream Cheese & Onions','Hand-rolled water bagel with smoked salmon, cream cheese and onions',14.65,true,5),
(rid,c_bakery,'The New Yorker Bagel','Hand-rolled water bagel with smoked salmon, cream cheese, capers, lettuce, tomato, sliced red onion and black olives',18.65,true,6),
(rid,c_bakery,'Buttered Roll','Fresh baked buttered roll',2.95,true,7),
(rid,c_bakery,'Homemade Muffin','Baked fresh daily — corn, bran, carrot or blueberry',3.65,true,8),
(rid,c_bakery,'Jumbo English Muffin','Toasted jumbo English muffin',2.95,true,9),
(rid,c_bakery,'Danish Pastry or Apple Turnover','Fresh Danish pastry or apple turnover',4.15,true,10),
(rid,c_bakery,'Croissant','Flaky butter croissant',3.65,true,11),
(rid,c_bakery,'Assorted Dry Cereals with Milk','Choice of dry cereal served with milk',5.35,true,12),
(rid,c_bakery,'Cereal with Raisins','Cereal with raisins and milk',5.95,true,13),
(rid,c_bakery,'Cereal with Seasonal Berries or Fruit Salad','Cereal with seasonal berries or fruit salad and milk',6.95,true,14),
(rid,c_bakery,'Old Fashioned Hot Oatmeal with Milk','Traditional hot oatmeal served with milk',5.35,true,15),
(rid,c_bakery,'Oatmeal with Raisins & Brown Sugar','Hot oatmeal with raisins and brown sugar',5.95,true,16),
(rid,c_bakery,'Oatmeal with Seasonal Berries','Hot oatmeal with seasonal berries',6.95,true,17);

-- ════════════════════════════════════════
-- 11. PRODUCTS — BREAKFAST WRAPS
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_bwraps,'Chorizo & Eggs','Three scrambled eggs with spicy Mexican sausage in a flour tortilla, served with home fries',15.95,true,1),
(rid,c_bwraps,'Southwestern Burrito','Scrambled eggs, sausage, bacon, onions, peppers, jalapenos and cheddar jack cheese with sour cream and salsa, served with home fries',15.95,true,2),
(rid,c_bwraps,'Mexi-Cali Rose Wrap','Egg whites, avocado, cheddar cheese, salsa and scallions, served with home fries',15.95,true,3),
(rid,c_bwraps,'South of the Border Burrito','Scrambled eggs, chili, cheddar jack cheese, sour cream and salsa, served with home fries',15.95,true,4);

-- ════════════════════════════════════════
-- 12. PRODUCTS — BURGERS (7 oz Angus Beef)
-- ════════════════════════════════════════
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Beef Burger','7 oz. Certified Angus beef burger served with French fries, lettuce, tomato, cole slaw and pickle',10.65,true,1) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Cheeseburger','Angus beef burger with your choice of cheese',11.65,true,2) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Swiss, Cheddar or Pepper Jack Cheeseburger','Angus burger with Swiss, cheddar or pepper jack cheese',11.65,true,3) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Bacon Burger','Angus burger topped with crispy bacon',11.65,true,4) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Bacon Cheeseburger','Angus burger with bacon and cheese',12.65,true,5) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Pizza Burger','Angus burger with melted mozzarella and marinara sauce on an English muffin',11.65,true,6) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Mushroom Burger','Angus burger topped with sauteed mushrooms',11.65,true,7) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Ranch Burger','Angus burger with bacon, cheddar and ranch dressing',12.65,true,8) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Texas Burger','Angus burger topped with one fried egg',11.65,true,9) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Turkey Burger','Lean turkey burger',11.65,true,10) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Veggie Burger','Plant-based veggie burger',11.65,true,11) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',4.00,2);
-- 9 oz Specialty Steak Burgers
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Western Burger','9 oz. steak burger with avocado, raw onion and ranch dressing. Deluxe served with waffle fries, lettuce and tomato',13.65,true,12) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',5.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Mexican Burger','9 oz. steak burger with cheddar cheese, grilled jalapeno peppers and guacamole',13.65,true,13) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',5.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Portobello Burger','9 oz. steak burger with grilled portobello mushroom and caramelized onions',13.65,true,14) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',5.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Alpine Burger','9 oz. steak burger with Swiss cheese, fried bell peppers and onions',13.65,true,15) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',5.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Reuben Pastrami Burger','9 oz. steak burger with sliced pastrami, sauerkraut, Russian dressing and melted Swiss cheese',14.65,true,16) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',5.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Roadhouse Burger','9 oz. steak burger with pepper jack cheese, bacon, avocado, grilled onions and chipotle sauce',14.65,true,17) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',5.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'BBQ Burger','9 oz. steak burger with bacon, fried onions, barbecue sauce and cheddar cheese',14.65,true,18) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',5.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Cowboy Burger','9 oz. steak burger with grilled wild mushrooms, grilled onions and pepper jack cheese',14.65,true,19) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',5.00,2);
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_burgers,'Chili Cheeseburger','9 oz. steak burger topped with jack cheese and house-made chili',14.65,true,20) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Regular',0,1),(pid,'Deluxe',5.00,2);

-- ════════════════════════════════════════
-- 13. PRODUCTS — SANDWICHES
-- ════════════════════════════════════════
-- Classic Sandwiches - Carving Board
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_sandwiches,'Corned Beef or Pastrami Sandwich','Freshly carved corned beef or pastrami on choice of bread with cole slaw and pickle',11.95,true,1),
(rid,c_sandwiches,'Roast Turkey Sandwich','All white meat roast turkey on choice of bread with cole slaw and pickle',11.95,true,2),
(rid,c_sandwiches,'Roast Beef Sandwich','Freshly carved roast beef on choice of bread with cole slaw and pickle',11.95,true,3),
(rid,c_sandwiches,'Roast Virginia Ham Sandwich','Roast Virginia ham on choice of bread with cole slaw and pickle',11.95,true,4),
(rid,c_sandwiches,'Grilled Chicken Breast Sandwich','Grilled chicken breast on choice of bread with cole slaw and pickle',10.95,true,5),
-- Meat sandwiches
(rid,c_sandwiches,'Boiled Ham Sandwich','Boiled ham on choice of bread',9.75,true,6),
(rid,c_sandwiches,'BLT','Crispy bacon, lettuce and tomato on choice of bread',8.55,true,7),
(rid,c_sandwiches,'Ham & American Cheese','Ham and American cheese with lettuce on choice of bread',8.95,true,8),
(rid,c_sandwiches,'Ham & Swiss (Finlandia)','Ham and imported Finlandia Swiss cheese on choice of bread',8.95,true,9),
(rid,c_sandwiches,'Fresh Mozzarella, Tomato & Basil Pesto','Fresh mozzarella with tomato and basil pesto on seven grain bread',8.55,true,10),
-- Cheese sandwiches
(rid,c_sandwiches,'Cream Cheese Sandwich','Cream cheese on choice of bread',5.45,true,11),
(rid,c_sandwiches,'American Cheese Sandwich','American cheese on choice of bread',7.85,true,12),
(rid,c_sandwiches,'Swiss Cheese (Finlandia) Sandwich','Imported Finlandia Swiss cheese on choice of bread',7.95,true,13),
(rid,c_sandwiches,'Grilled American Cheese','Grilled American cheese sandwich',7.45,true,14),
(rid,c_sandwiches,'Grilled Cheese with Tomatoes','Grilled cheese with sliced tomatoes',7.95,true,15),
(rid,c_sandwiches,'Grilled Cheese with Bacon or Ham','Grilled cheese with crispy bacon or ham',8.75,true,16),
(rid,c_sandwiches,'Grilled Swiss Cheese','Grilled Finlandia Swiss cheese sandwich',7.65,true,17),
(rid,c_sandwiches,'Grilled Swiss with Tomatoes','Grilled Swiss cheese with sliced tomatoes',8.15,true,18),
(rid,c_sandwiches,'Grilled Swiss with Bacon or Ham','Grilled Swiss with bacon or ham',8.65,true,19),
-- Salad sandwiches
(rid,c_sandwiches,'Chicken Salad Sandwich','House-made chicken salad on choice of bread',9.25,true,20),
(rid,c_sandwiches,'Tuna Fish Salad Sandwich','Fresh tuna salad on choice of bread',9.75,true,21),
(rid,c_sandwiches,'Shrimp Salad Sandwich','Shrimp salad on choice of bread',10.95,true,22),
(rid,c_sandwiches,'Daily Made Egg Salad Sandwich','Fresh egg salad on choice of bread',8.35,true,23),
-- Fish & Egg
(rid,c_sandwiches,'Fried Tilapia Filet Sandwich','Crispy fried tilapia filet sandwich',14.65,true,24),
(rid,c_sandwiches,'Fried Filet of Sole Sandwich','Golden fried filet of sole sandwich',16.65,true,25),
(rid,c_sandwiches,'Fried Eggs (2) Sandwich','Two fried eggs on a roll',4.85,true,26),
(rid,c_sandwiches,'Fried Eggs with Ham, Bacon or Sausage','Fried eggs with choice of meat on a roll',6.45,true,27),
(rid,c_sandwiches,'Fried Eggs with Canadian Bacon','Fried eggs with Canadian bacon on a roll',7.85,true,28),
(rid,c_sandwiches,'Western Egg Sandwich','Western-style egg sandwich',7.75,true,29),
-- Monte Cristo
(rid,c_sandwiches,'Monte Cristo','Challah French toast with turkey, ham and melted Swiss cheese',18.55,true,30),
-- Hot Open Sandwiches
(rid,c_sandwiches,'Hot Open Sliced Turkey','Sliced turkey with giblet gravy and cranberry sauce, served with soup or salad, potato and vegetable',23.95,true,31),
(rid,c_sandwiches,'Hot Open Sliced Prime Roast Beef','Sliced prime roast beef with gravy, served with soup or salad, potato and vegetable',23.95,true,32),
-- Triple Decker Clubs
(rid,c_sandwiches,'Turkey & Bacon Club','Turkey and bacon with lettuce and tomato, served with French fries, cole slaw and pickle',18.75,true,33),
(rid,c_sandwiches,'Chicken Salad & Bacon Club','Chicken salad and bacon with lettuce and tomato, served with fries, cole slaw and pickle',16.75,true,34),
(rid,c_sandwiches,'Tuna Salad & Sliced Egg Club','Tuna salad and sliced egg with lettuce and tomato, served with fries, cole slaw and pickle',16.75,true,35),
(rid,c_sandwiches,'Roast Beef & Swiss Club','Roast beef and Swiss cheese with lettuce and tomato, served with fries, cole slaw and pickle',18.75,true,36),
(rid,c_sandwiches,'Grilled Chicken & Bacon Club','Grilled chicken and bacon with lettuce and tomato, served with fries, cole slaw and pickle',18.75,true,37);

-- ════════════════════════════════════════
-- 14. PRODUCTS — CHICKEN SANDWICHES
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_chickensand,'Chicken Breast Sandwich','Grilled marinated chicken breast with chopped lettuce and tomato on a brioche bun, served with French fries, cole slaw and pickle',18.95,true,1),
(rid,c_chickensand,'Cajun Chicken','Blackened chicken breast topped with cheddar cheese on a brioche bun',21.95,true,2),
(rid,c_chickensand,'Chicken Cordon Bleu','Chicken breast with ham and Swiss cheese on a brioche bun',21.95,true,3),
(rid,c_chickensand,'California Chicken','Chicken breast with sliced avocado, roasted onions, peppers and ranch dressing on a brioche bun',21.95,true,4),
(rid,c_chickensand,'Mexicana Chicken','Chicken breast with pepper jack cheese, grilled jalapeno peppers and guacamole on a brioche bun',21.95,true,5),
(rid,c_chickensand,'Alpine Chicken','Chicken breast with Swiss cheese, caramelized onions and peppers on a brioche bun',21.95,true,6),
(rid,c_chickensand,'Portobello Chicken','Chicken breast with portobello mushroom, caramelized onions and fresh mozzarella with balsamic reduction on a brioche bun',21.95,true,7),
(rid,c_chickensand,'Grilled Chicken Parmigiana Sandwich','Chicken breast with melted mozzarella and marinara sauce on a brioche bun',21.95,true,8),
(rid,c_chickensand,'American Classic Chicken','Chicken breast with chopped bacon and American cheese on a brioche bun',21.95,true,9);

-- ════════════════════════════════════════
-- 15. PRODUCTS — PANINI & WRAPS
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_panini,'Grilled Salmon Wrap','Grilled salmon with tomato, arugula, roasted peppers and onions in a flour tortilla, served with French fries or tossed salad',20.95,true,1),
(rid,c_panini,'Chicken Fajita Wrap','Grilled chicken with roasted peppers, roasted onions, lettuce and salsa',18.95,true,2),
(rid,c_panini,'Portobello Wrap','Grilled portobello mushroom, fresh mozzarella, lettuce, tomato, roasted peppers and balsamic sauce',17.95,true,3),
(rid,c_panini,'New York Wrap','Pastrami, Swiss and honey mustard',18.95,true,4),
(rid,c_panini,'Philly Steak Wrap','Steak with onions, peppers, cheddar and lettuce',18.95,true,5),
(rid,c_panini,'Honey Chicken Wrap','Chicken with bacon, lettuce, tomato and honey mustard',18.95,true,6),
(rid,c_panini,'Omaha Steak Wrap','Romanian steak with roasted peppers, onions and barbecue sauce',22.95,true,7),
(rid,c_panini,'Tijuana Chicken Wrap','Spicy grilled chicken with onions, cheddar cheese, roasted peppers and chipotle sauce',18.95,true,8),
(rid,c_panini,'California Chicken Wrap','Grilled chicken, sliced avocado, chopped lettuce, tomatoes, roasted peppers and ranch dressing',18.95,true,9),
(rid,c_panini,'Caesar Wrap','Grilled chicken with romaine lettuce, red onions and Caesar dressing',18.95,true,10);

-- ════════════════════════════════════════
-- 16. PRODUCTS — SOUPS & SALADS
-- ════════════════════════════════════════
INSERT INTO products (id,restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES (gen_random_uuid(),rid,c_soups,'Soup of the Day','Freshly made soup of the day',4.95,true,1) RETURNING id INTO pid;
INSERT INTO product_variants (product_id,name,price_delta,sort_order) VALUES (pid,'Cup',0,1),(pid,'Bowl',1.70,2),(pid,'Extra Large Bowl',5.40,3);
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_soups,'Chili','Hearty homemade chili bowl',10.95,true,2),
(rid,c_soups,'Greek Salad','Tomatoes, cucumbers, onions, kalamata olives, feta cheese, anchovies and stuffed grape leaves',14.95,true,3),
(rid,c_soups,'Strawberry Fields Salad','Mixed baby greens, red onions, cherry tomatoes, crumbled feta cheese, fresh strawberries and walnuts with homemade vinaigrette dressing',16.95,true,4),
(rid,c_soups,'Caesar Salad','Crisp romaine lettuce tossed with creamy Caesar dressing, parmesan cheese, grape tomatoes and seasoned croutons',14.95,true,5),
(rid,c_soups,'Santa Fe Salad','Marinated chicken breast, red beans, cilantro, shredded cheddar cheese, tortilla chips, cherry tomatoes over romaine lettuce with avocado and lime cilantro dressing',19.95,true,6),
(rid,c_soups,'Mediterranean Salad','Grilled chicken over mixed greens, tomatoes, cucumbers, peppers, feta cheese, kalamata olives and homemade house dressing',19.95,true,7),
(rid,c_soups,'Chef''s Salad','Sliced ham, turkey, roast beef, Swiss cheese, cucumbers and sliced hard-boiled egg over tossed salad with choice of dressing',16.15,true,8),
(rid,c_soups,'Steak Bistro Salad','Grilled sliced Romanian tenderloin steak over house garden salad with cheddar cheese, tomatoes, red onions and sliced peppers with choice of dressing',22.95,true,9),
(rid,c_soups,'BBQ Ranch Chicken Salad','Chicken with avocado, tomato, corn, red beans, cucumber and romaine, all tossed with barbecue ranch dressing, topped with crispy tortillas',19.95,true,10),
(rid,c_soups,'West Coast Grilled Chicken Salad','Marinated grilled chicken, avocado, red onion, sliced peppers, chopped bacon and cherry tomatoes over romaine lettuce with lime cilantro dressing',19.95,true,11),
(rid,c_soups,'Taco Salad','Grilled chorizo sausage, romaine lettuce, avocado, beans, corn, heirloom tomatoes, cheese, cilantro and tortilla strings',19.95,true,12),
(rid,c_soups,'Cobb Salad','Sliced chicken or turkey, tossed salad, corn, avocado, heirloom tomatoes, onions and hard-boiled egg with choice of dressing',19.95,true,13),
(rid,c_soups,'Chopped Buffalo Salad','Breaded chicken tenders tossed in a medium buffalo sauce over romaine lettuce with cucumber, tomatoes, onions, cheddar cheese, crumbled blue cheese and bleu cheese dressing',19.95,true,14),
(rid,c_soups,'Crispy Greens with Salmon','Peppercorn seasoned grilled Norwegian salmon over mixed greens, tomatoes, cucumbers, sun-dried tomatoes, capers and red onions with homemade vinaigrette dressing',22.95,true,15),
-- Cold Salad Platters
(rid,c_soups,'Tuna Salad Platter','Tuna salad served on a bed of crisp lettuce with potato salad, cole slaw, hard-boiled egg, sliced tomato, cucumber and green pepper',16.95,true,16),
(rid,c_soups,'Chicken Salad Platter','Chicken salad platter with potato salad, cole slaw and fresh vegetables',16.95,true,17),
(rid,c_soups,'Shrimp Salad Platter','Shrimp salad platter with potato salad, cole slaw and fresh vegetables',18.95,true,18),
(rid,c_soups,'Stuffed California Avocado','Chicken salad, tuna salad or shrimp salad with tomatoes, olives, cucumbers, radishes and red onions',16.75,true,19);

-- ════════════════════════════════════════
-- 17. PRODUCTS — APPETIZERS
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_appetizers,'The Sampler','A delicious combination of mozzarella sticks, buffalo wings, chicken fingers and potato skins',18.95,true,1),
(rid,c_appetizers,'Stuffed Mushrooms or Clams','Stuffed with our own crabmeat stuffing',14.95,true,2),
(rid,c_appetizers,'Clams Casino','Half dozen fresh littleneck clams baked with our own casino stuffing',14.95,true,3),
(rid,c_appetizers,'Mini Crab Cakes','Mini New Orleans-style crab cakes with chipotle mayo sauce',15.95,true,4),
(rid,c_appetizers,'Fried Calamari','Our famous calamari as an appetizer, served with marinara sauce',15.95,true,5),
(rid,c_appetizers,'Mini Taco','Mini Mexican-style taco made with seasoned ground chicken, served with taco sauce',12.95,true,6),
(rid,c_appetizers,'Mediterranean Style Spinach Pie','Flaky phyllo dough stuffed with a blend of fresh spinach and feta',12.95,true,7),
(rid,c_appetizers,'Potato Skins','Cheddar, chopped bacon and sour cream, topped with scallions',12.55,true,8),
(rid,c_appetizers,'Disco Fries','French fries with melted cheese and gravy',10.95,true,9),
(rid,c_appetizers,'Greek Fries','French fries with crumbled feta cheese and oregano',10.95,true,10),
(rid,c_appetizers,'Mozzarella Sticks','Golden mozzarella sticks served with marinara sauce',12.95,true,11),
(rid,c_appetizers,'Jalapeno Poppers','Breaded and stuffed with cheddar cheese, served with our marinara sauce',12.95,true,12),
(rid,c_appetizers,'Buffalo Wings','Served hot and spicy with our own blue cheese dressing',12.95,true,13),
(rid,c_appetizers,'Chicken Tenders','Crispy chicken tenders served with honey mustard',12.95,true,14),
(rid,c_appetizers,'Chicken or Pulled Pork Quesadillas','Grilled quesadilla with melted cheese, served with plantain sides',14.95,true,15),
(rid,c_appetizers,'Loaded Nachos Chili Con Carne','Fresh and crispy tortilla chips loaded with hearty chili, topped with melted cheddar and pepper jack cheese, sour cream and guacamole, finished with hot grilled jalapeno peppers',14.95,true,16),
(rid,c_appetizers,'Guacamole Dip','Fresh guacamole served with tortilla chips, sour cream and homemade salsa',12.45,true,17);

-- ════════════════════════════════════════
-- 18. PRODUCTS — ENTREES & STEAKS
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_entrees,'Sliced Prime Roast Beef','Sliced prime roast beef au jus, served with soup or Caesar salad, potato and vegetable',24.95,true,1),
(rid,c_entrees,'Roast Virginia Ham','Roast Virginia ham with brown gravy, served with soup or salad, potato and vegetable',23.95,true,2),
(rid,c_entrees,'Fried Chicken','Fried chicken four-piece dinner, served with soup or salad, potato and vegetable',22.95,true,3),
(rid,c_entrees,'Chopped Sirloin Steak','Chopped sirloin steak with fried onions, served with soup or Caesar salad, potato and vegetable',26.95,true,4),
(rid,c_entrees,'2 Thick Cut Jersey Pork Chops','Two thick-cut Jersey pork chops with applesauce, served with soup or salad, potato and vegetable',29.95,true,5),
(rid,c_entrees,'N.Y. Cut Sirloin Steak (approx 16 oz.)','USDA Choice New York cut sirloin steak, served with soup or salad, potato and vegetable',40.95,true,6),
(rid,c_entrees,'Romanian Tenderloin Steak','Premium Romanian tenderloin steak, served with soup or salad, potato and vegetable',40.95,true,7),
(rid,c_entrees,'St. Louis BBQ Spare Ribs','St. Louis-style BBQ spare ribs with cole slaw and steak-cut onion rings',27.95,true,8),
(rid,c_entrees,'Porterhouse (approx 18-20 oz.)','USDA Choice porterhouse steak, served with soup or salad, potato and vegetable',41.95,true,9);

-- ════════════════════════════════════════
-- 19. PRODUCTS — SEAFOOD
-- ════════════════════════════════════════
-- Broiled
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_seafood,'Twin 5 oz. Rock Lobster Tails','Broiled twin rock lobster tails with drawn butter and lemon, served with soup or salad, potato and vegetable',47.95,true,1),
(rid,c_seafood,'Jumbo Shrimp (6) Broiled','Six jumbo shrimp broiled with wine butter sauce, served with soup or salad, potato and vegetable',33.95,true,2),
(rid,c_seafood,'Shrimp Scampi (6)','Six shrimp with roasted garlic wine butter sauce, served with soup or salad, potato and vegetable',33.75,true,3),
(rid,c_seafood,'Deep Sea Scallops','Broiled deep sea scallops with herb olive oil and roasted garlic, served with soup or salad, potato and vegetable',36.75,true,4),
(rid,c_seafood,'Filet of Sole Broiled','Broiled filet of sole with butter sauce or lemon olive oil sauce, served with soup or salad, potato and vegetable',36.75,true,5),
(rid,c_seafood,'Whole Flounder','Broiled whole flounder with garlic or lemon wine sauce, served with soup or salad, potato and vegetable',32.75,true,6),
(rid,c_seafood,'Atlantic Salmon Filet','Broiled Atlantic salmon filet with garlic or lemon wine sauce, served with soup or salad, potato and vegetable',33.75,true,7),
(rid,c_seafood,'Tilapia Filet Broiled','Broiled tilapia filet with butter sauce or lemon olive oil sauce, served with soup or salad, potato and vegetable',30.75,true,8),
-- Fried
(rid,c_seafood,'Fried Calamari Dinner','Fried calamari with marinara sauce, served with soup or salad, potato and vegetable',25.95,true,9),
(rid,c_seafood,'Fried Filet of Sole','Golden fried filet of sole with lemon wedge and tartar sauce',33.95,true,10),
(rid,c_seafood,'Fried Scallops','Crispy fried scallops with lemon wedge and tartar sauce',34.95,true,11),
(rid,c_seafood,'Fried Jumbo Shrimp (6)','Six jumbo fried shrimp with lemon wedge and tartar sauce',32.95,true,12),
(rid,c_seafood,'Seafood Combination','Fried shrimp, scallops and filet of sole with tartar sauce',37.95,true,13),
(rid,c_seafood,'Fried Tilapia','Fried tilapia with lemon wedge and tartar sauce',28.95,true,14),
-- Stuffed
(rid,c_seafood,'Stuffed Filet of Sole','Filet of sole with crabmeat stuffing',35.95,true,15),
(rid,c_seafood,'Stuffed Salmon Florentine','Salmon with spinach, wild mushrooms, grilled tomatoes and feta cheese',32.95,true,16),
(rid,c_seafood,'Stuffed Clams','Clams with crabmeat stuffing',26.95,true,17),
(rid,c_seafood,'Stuffed Tilapia Filet','Tilapia filet with crabmeat stuffing',30.95,true,18),
(rid,c_seafood,'Stuffed Shrimp','Jumbo shrimp with crabmeat stuffing',34.95,true,19);

-- ════════════════════════════════════════
-- 20. PRODUCTS — ITALIAN & PASTA
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_italian,'Linguine with Meatballs','Linguine pasta with homemade meatballs and marinara, served with soup or salad',20.95,true,1),
(rid,c_italian,'Linguine with Tomato Sauce','Linguine pasta in tomato sauce, served with soup or salad',17.95,true,2),
(rid,c_italian,'Meat Ravioli','Meat ravioli topped with melted mozzarella, served with soup or salad',21.95,true,3),
(rid,c_italian,'Cheese Ravioli','Cheese ravioli topped with melted mozzarella, served with soup or salad',21.95,true,4),
(rid,c_italian,'Fried Calamari with Linguine','Crispy fried calamari with linguine pasta',33.95,true,5),
(rid,c_italian,'Eggplant Parmigiana','Breaded eggplant with marinara and melted mozzarella, served with linguine',21.95,true,6),
(rid,c_italian,'Fried Shrimp Parmigiana','Fried shrimp with marinara and mozzarella, served with linguine',29.95,true,7),
(rid,c_italian,'Chicken Cutlet Parmigiana','Breaded chicken cutlet with marinara and mozzarella, served with linguine',24.95,true,8),
(rid,c_italian,'Mac N'' Cheese','Cavatappi pasta with four-cheese sauce',18.75,true,9),
(rid,c_italian,'Mac N'' Cheese with Chicken','Cavatappi pasta with four-cheese sauce and grilled chicken',22.95,true,10),
(rid,c_italian,'Mac N'' Cheese with Shrimp','Cavatappi pasta with four-cheese sauce and sauteed shrimp',24.95,true,11),
(rid,c_italian,'Penne Pasta with Chicken & Shrimp','Chunks of chicken breast and shrimp sauteed in basil pignoli pesto over penne pasta, served with soup or salad',24.95,true,12),
(rid,c_italian,'Penne Pasta with Vodka Sauce','Chunks of chicken breast and shrimp sauteed with sun-dried tomatoes in vodka sauce over penne pasta',24.95,true,13),
(rid,c_italian,'Pasta Da Vinci','Whole shrimp and fresh mushrooms sauteed in a delicate pink sauce over pasta, served with soup or salad',25.95,true,14),
(rid,c_italian,'Fettuccine Alfredo','Fettuccine sauteed with shrimp and fresh vegetables in alfredo sauce, served with soup or salad',25.95,true,15),
(rid,c_italian,'Chicken Primavera','White meat chicken and broccoli, mushrooms, peas, squash and cauliflower, sauteed with tomatoes in wine sauce over penne or rice',23.95,true,16),
(rid,c_italian,'Salmon Saute with Penne Pasta','Fresh sauteed filet of salmon with lobster sauce, over penne or linguine sauteed in olive oil and white wine',25.95,true,17),
(rid,c_italian,'Linguine Aglio e Olio','Broccoli, shallots and garlic sauteed in virgin olive oil with linguine',19.95,true,18);

-- ════════════════════════════════════════
-- 21. PRODUCTS — GREEK CORNER
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_greek,'Chicken Souvlaki','Chicken souvlaki served on pita bread with French fries, Greek salad and tzatziki sauce',24.95,true,1),
(rid,c_greek,'Grilled Breast of Chicken','Seasoned grilled chicken breast served with a bowl of Greek salad, potato, vegetable and tzatziki sauce',25.95,true,2),
(rid,c_greek,'Greek Gyro','Gyro meat on pita bread with a bowl of Greek salad, potato, vegetable and tzatziki sauce',24.95,true,3),
(rid,c_greek,'Spinach Pie Deluxe','Spinach pie served with a small Greek salad and French fries',19.95,true,4),
(rid,c_greek,'Gyro or Souvlaki Sandwich','Gyro meat or chicken souvlaki served on pita bread',12.95,true,5);

-- ════════════════════════════════════════
-- 22. PRODUCTS — SIGNATURE DISHES & SAUTEED
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_signature,'Fisherman''s Platter','Broiled stuffed shrimp, stuffed filet, stuffed clam, scallops, lobster tail and baked tomato, topped with garlic sauce, served with soup or salad, potato and vegetable',43.95,true,1),
(rid,c_signature,'Mariner''s Combo','Broiled stuffed filet, stuffed shrimp, stuffed clam, scallops and baked tomato, topped with garlic sauce, served with soup or salad, potato and vegetable',37.95,true,2),
(rid,c_signature,'Sea & Land','Skirt steak, two shrimp and two stuffed clams scampi style, served with soup or salad, potato and vegetable',38.95,true,3),
(rid,c_signature,'Beef & Reef','One 5 oz. lobster tail, two stuffed clams and Romanian steak, served with soup or salad, potato and vegetable',37.95,true,4),
(rid,c_signature,'Surf & Turf','NY cut steak and one 5 oz. lobster tail, served with soup or salad, potato and vegetable',50.95,true,5),
(rid,c_signature,'Steak & Shrimp Combination','Fried or broiled shrimp (3) and rib steak, served with soup or salad, potato and vegetable',37.95,true,6),
(rid,c_signature,'Skirt Steak Tips','Steak tips and sliced fresh mushrooms broiled in marsala wine sauce, served over rice with salad',30.95,true,7),
(rid,c_signature,'Frutti Di Mare','Linguine with calamari, shrimp, mussels, crabmeat, octopus and scallops sauteed in olive oil and white wine with choice of marinara or lobster sauce, served with soup or salad',33.95,true,8),
(rid,c_signature,'Crispy Salmon','Crispy skinned salmon with wild mushrooms and chive mashed potato, served with soup or salad and vegetable',31.95,true,9),
-- Sauteed Specialties
(rid,c_signature,'Chicken Francaise','Breast of chicken sauteed with creamy wine sauce and a hint of lemon, served over rice or with potato and vegetable, with soup or salad',28.95,true,10),
(rid,c_signature,'Chicken Cordon Bleu','Breast of chicken sauteed and stuffed with prosciutto and gruyere cheese, topped with creamy white sauce, served with potato and vegetable',28.95,true,11),
(rid,c_signature,'Chicken Breast Saute','White meat chicken with mushrooms, sauteed in wine sauce, served over rice with soup or salad',28.95,true,12),
(rid,c_signature,'Tilapia Francaise','Tilapia sauteed with creamy wine sauce and a hint of lemon, served with potato and vegetable',28.95,true,13),
(rid,c_signature,'Chicken Marsala','Sliced chicken breast sauteed in marsala wine sauce with mushroom, onions, peppers and plum tomatoes, served over rice',27.95,true,14),
(rid,c_signature,'Chicken Piccata','Succulent breast of chicken sauteed with scallions and capers in a white wine sauce with a hint of fresh lemon, served with potato and vegetable',27.95,true,15),
(rid,c_signature,'Shrimp Francaise','Six jumbo shrimp sauteed with creamy wine sauce and a hint of lemon, served over rice',32.95,true,16),
(rid,c_signature,'Buccaneer Combination','Shrimp and chicken tips sauteed in scampi sauce, served over rice',29.95,true,17);

-- ════════════════════════════════════════
-- 23. PRODUCTS — SIDE ORDERS
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_sides,'French Fries','Crispy golden French fries',6.35,true,1),
(rid,c_sides,'Loaded French Fries','French fries with melted mozzarella, American cheese, chopped bacon and dipping sauce',9.35,true,2),
(rid,c_sides,'Waffle Fries','Crispy waffle-cut fries',6.35,true,3),
(rid,c_sides,'Sweet Potato Fries','Crispy sweet potato fries',6.95,true,4),
(rid,c_sides,'Fried Plantains (Tostones)','Crispy fried green plantains',7.35,true,5),
(rid,c_sides,'Onion Rings','Steak-cut fried onion rings',7.35,true,6),
(rid,c_sides,'Lettuce & Tomato Salad','Simple lettuce and tomato salad',6.75,true,7),
(rid,c_sides,'Tossed Salad','Mixed greens tossed salad',8.35,true,8),
(rid,c_sides,'Bacon, Sausage, Ham or Turkey Sausage','Side of bacon, sausage, ham or turkey sausage',6.35,true,9),
(rid,c_sides,'Turkey Bacon or Canadian Bacon','Side of turkey bacon or Canadian bacon',7.35,true,10),
(rid,c_sides,'Corned Beef Hash','Side of homemade corned beef hash',7.35,true,11),
(rid,c_sides,'Baked Potato','Baked potato',6.35,true,12),
(rid,c_sides,'Stuffed Baked Potato with Broccoli & Cheese','Baked potato stuffed with broccoli and cheese',8.35,true,13),
(rid,c_sides,'Stuffed Baked Potato with Bacon & Cheese','Baked potato stuffed with bacon and cheese',8.35,true,14),
(rid,c_sides,'Cole Slaw or Potato Salad or Apple Sauce','Side of cole slaw, potato salad or apple sauce',5.95,true,15),
(rid,c_sides,'Cottage Cheese','Side of cottage cheese',5.95,true,16),
(rid,c_sides,'Vegetable of the Day','Fresh seasonal vegetable',6.65,true,17),
(rid,c_sides,'Broccoli with Cheese','Steamed broccoli with melted cheese — mozzarella or American',7.45,true,18),
(rid,c_sides,'Feta Cheese','Side of feta cheese',7.35,true,19),
(rid,c_sides,'Tzatziki Dip with Toasted Pita Wedges','Creamy tzatziki dip served with warm toasted pita wedges',7.25,true,20),
(rid,c_sides,'Guacamole','Fresh made guacamole',6.45,true,21),
(rid,c_sides,'Sliced Avocado','Fresh sliced avocado',6.45,true,22);

-- ════════════════════════════════════════
-- 24. PRODUCTS — COCKTAILS
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_cocktails,'Sea Breeze','Vodka, grapefruit juice and cranberry juice',10.95,true,1),
(rid,c_cocktails,'Bay Breeze','Vodka, orange juice and cranberry juice',10.95,true,2),
(rid,c_cocktails,'Sex on the Beach','Vodka, orange juice, peach schnapps and grenadine',10.95,true,3),
(rid,c_cocktails,'Singapore Sling','Gin, cherry liqueur and sweet and sour',10.95,true,4),
(rid,c_cocktails,'Sloe Gin Fizz','Sloe gin and sweet and sour',10.95,true,5),
(rid,c_cocktails,'Toasted Almond','Coffee liqueur, amaretto and cream',10.95,true,6),
(rid,c_cocktails,'Tom Collins','Gin with sweet and sour',10.95,true,7),
(rid,c_cocktails,'Whiskey Sour','Whiskey with sweet and sour',10.95,true,8),
(rid,c_cocktails,'Apricot Sour','Apricot brandy and lemon juice',10.95,true,9),
(rid,c_cocktails,'Zombie','Apricot brandy, light rum, Jamaican rum, orange juice and lime juice',10.95,true,10),
(rid,c_cocktails,'Woo Woo','Vodka, peach schnapps and cranberry juice',10.95,true,11),
(rid,c_cocktails,'Banana Daiquiri','Fresh fruit, fruit liqueur, light rum and lemon juice',10.95,true,12),
(rid,c_cocktails,'Pineapple Daiquiri','Fresh fruit, fruit liqueur, light rum and lemon juice',10.95,true,13),
(rid,c_cocktails,'Strawberry Daiquiri','Fresh fruit, fruit liqueur, light rum and lemon juice',10.95,true,14),
(rid,c_cocktails,'Virgin Daiquiri','Non-alcoholic fruit daiquiri',7.95,true,15),
(rid,c_cocktails,'Alabama Slammer','Vodka, Southern Comfort, orange juice and grenadine',10.95,true,16),
(rid,c_cocktails,'Brandy Alexander','Brandy, vanilla ice cream, whipped and topped with cinnamon',10.95,true,17),
(rid,c_cocktails,'Casa Blanca','Rum, lime juice and triple sec',10.95,true,18),
(rid,c_cocktails,'Fuzzy Navel','Peach schnapps and orange juice',10.95,true,19),
(rid,c_cocktails,'Godfather','Scotch and amaretto',10.95,true,20),
(rid,c_cocktails,'White Russian','Vodka, Kahlua and cream',10.95,true,21),
(rid,c_cocktails,'Black Russian','Vodka and Kahlua',10.95,true,22),
(rid,c_cocktails,'Golden Cadillac','Galliano, creme de cacao and light cream',10.95,true,23),
(rid,c_cocktails,'Kamikaze','Vodka, triple sec and lime juice',10.95,true,24),
(rid,c_cocktails,'L.I. Iced Tea','Gin, rum, tequila, lemon, cola',13.95,true,25),
(rid,c_cocktails,'Melon Ball','Melon liqueur, vodka and pineapple juice',10.95,true,26),
(rid,c_cocktails,'Planter''s Punch','Light rum, lime juice and grenadine',10.95,true,27),
(rid,c_cocktails,'Chi-Chi','Vodka, cream of coconut and pineapple juice',10.95,true,28),
(rid,c_cocktails,'Blue Hawaiian','Light rum, blue curacao and pineapple juice',10.95,true,29),
(rid,c_cocktails,'Mimosa','Champagne and orange juice',10.95,true,30),
(rid,c_cocktails,'Pina Colada','Light rum, coconut milk and crushed pineapple',10.95,true,31),
(rid,c_cocktails,'Virgin Pina Colada','Non-alcoholic pina colada',7.95,true,32);

-- ════════════════════════════════════════
-- 25. PRODUCTS — SMOOTHIES & BEVERAGES
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_smoothies,'Sweet Summer Smoothie','Low-fat Greek yogurt, strawberries, banana and melon',10.95,true,1),
(rid,c_smoothies,'Orange Buzz Smoothie','Low-fat Greek yogurt, oranges, pineapple and banana',10.95,true,2),
(rid,c_smoothies,'Blue Moon Smoothie','Low-fat Greek yogurt, blueberries, banana and orange juice',10.95,true,3),
(rid,c_smoothies,'The Floridian Smoothie','Low-fat Greek yogurt, orange juice, pineapple and honey',10.95,true,4),
(rid,c_smoothies,'Smoothie Colada','Low-fat Greek yogurt, pineapple, coconut cream and banana',10.95,true,5),
(rid,c_smoothies,'Fruit Fusion Smoothie','Low-fat Greek yogurt, fruit medley and apple juice',10.95,true,6),
(rid,c_smoothies,'Assorted Sodas & Diet Sodas','Coca-Cola, Diet Coke, Sprite and more (free refills)',3.35,true,7),
(rid,c_smoothies,'Seltzer Water','Sparkling seltzer water',2.15,true,8),
(rid,c_smoothies,'Lemonade','Fresh lemonade',4.65,true,9),
(rid,c_smoothies,'Milk','Cold milk',3.15,true,10),
(rid,c_smoothies,'Chocolate Milk','Rich chocolate milk',4.35,true,11);

-- ════════════════════════════════════════
-- 26. PRODUCTS — COFFEE & HOT DRINKS
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_coffee,'Coffee (Free Refill)','Fresh brewed coffee with free refills',2.85,true,1),
(rid,c_coffee,'Fresh Brewed Decaf Coffee (Free Refill)','Decaffeinated coffee with free refills',2.85,true,2),
(rid,c_coffee,'Tea','Hot tea',2.85,true,3),
(rid,c_coffee,'Assorted Herbal Teas','Selection of herbal teas',3.15,true,4),
(rid,c_coffee,'Decaf Tea','Decaffeinated tea',2.85,true,5),
(rid,c_coffee,'Hot Chocolate with Whipped Cream','Rich hot chocolate topped with whipped cream',3.55,true,6),
(rid,c_coffee,'Espresso','Single shot espresso',4.15,true,7),
(rid,c_coffee,'Cappuccino','Classic Italian cappuccino',5.35,true,8),
(rid,c_coffee,'Cafe Latte','Double shot of espresso with extra steamed milk',5.65,true,9),
(rid,c_coffee,'Hot Mochaccino','Double espresso, hot chocolate, steamed milk and whipped cream',5.65,true,10),
(rid,c_coffee,'Frappe (Iced)','Iced frappe coffee',4.95,true,11),
(rid,c_coffee,'Iced Coffee or Iced Tea','Chilled iced coffee or iced tea',3.85,true,12);

-- ════════════════════════════════════════
-- 27. PRODUCTS — DESSERTS
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_desserts,'Chocolate Layer Cake','Rich chocolate layer cake',6.65,true,1),
(rid,c_desserts,'Coconut Lemon Layer Cake','Coconut lemon layer cake',6.65,true,2),
(rid,c_desserts,'Strawberry Short Cake','Classic strawberry shortcake',6.75,true,3),
(rid,c_desserts,'Carrot Cake','Homemade carrot cake',6.75,true,4),
(rid,c_desserts,'Plain Cheesecake - NY Style','New York-style plain cheesecake',6.95,true,5),
(rid,c_desserts,'Fruit Cheesecake','Cheesecake topped with seasonal fruit',8.15,true,6),
(rid,c_desserts,'Chocolate Cheesecake','Rich chocolate cheesecake',8.15,true,7),
(rid,c_desserts,'Lemon Meringue Pie','Classic lemon meringue pie',6.75,true,8),
(rid,c_desserts,'Chocolate Mousse','Silky chocolate mousse',6.75,true,9),
(rid,c_desserts,'All Pound Cakes','Assorted pound cake slices',4.65,true,10),
(rid,c_desserts,'Greek Pastries','Assorted Greek pastries',6.75,true,11),
(rid,c_desserts,'Danish Pastry or Apple Turnover','Danish pastry or apple turnover',4.25,true,12),
(rid,c_desserts,'Rice Pudding','Creamy homemade rice pudding',5.35,true,13),
(rid,c_desserts,'Jello with Fruit Cocktail','Jello dessert with fruit cocktail',5.35,true,14),
(rid,c_desserts,'Brownies','Rich chocolate brownies',5.15,true,15),
(rid,c_desserts,'Chocolate Chip Cookies','Fresh-baked chocolate chip cookies',4.55,true,16),
(rid,c_desserts,'Apple Pie','Classic apple pie',5.85,true,17),
(rid,c_desserts,'Apple Crumb Pie','Apple crumb pie with streusel topping',5.85,true,18);

-- ════════════════════════════════════════
-- 28. PRODUCTS — ICE CREAM & FOUNTAIN
-- ════════════════════════════════════════
INSERT INTO products (restaurant_id,category_id,name,description,price,is_active,sort_order) VALUES
(rid,c_icecream,'Ice Cream Soda','Classic ice cream soda, all flavors',7.15,true,1),
(rid,c_icecream,'Milk Shake','Thick and creamy milk shake, all flavors',7.15,true,2),
(rid,c_icecream,'Oreo Cookie Shake','Milk shake blended with Oreo cookies',7.45,true,3),
(rid,c_icecream,'Nutella Banana Shake','Rich Nutella and banana milk shake',7.95,true,4),
(rid,c_icecream,'Double Rich Milk Shake','Extra thick double-rich milk shake',8.15,true,5),
(rid,c_icecream,'Egg Cream','Classic New York egg cream',5.15,true,6),
(rid,c_icecream,'Brownie All The Way','Hot fudge brownie with ice cream, walnuts and whipped cream',8.35,true,7),
(rid,c_icecream,'Ice Cream (Two Scoops)','Two scoops of ice cream, choice of flavor',6.15,true,8),
(rid,c_icecream,'Sundaes with Whipped Cream','Ice cream sundae with whipped cream, all flavors',7.35,true,9),
(rid,c_icecream,'Sundae with Nuts or Fruit','Ice cream sundae with nuts or fruit topping',7.35,true,10),
(rid,c_icecream,'Banana Split','Whole banana with three scoops of ice cream, chocolate syrup, strawberry topping, whipped cream and walnuts',10.15,true,11);

-- ════════════════════════════════════════
-- 29. EXTRAS — Omelettes
-- ════════════════════════════════════════
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Additional Egg', 1.25, 1 FROM products WHERE restaurant_id = rid AND category_id = c_omelettes;
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Add Cheese', 1.25, 2 FROM products WHERE restaurant_id = rid AND category_id = c_omelettes;

-- Extras — Eggs: Egg Whites 1.25, Roll/English Muffin/Bagel 1.00
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Egg Whites', 1.25, 1 FROM products WHERE restaurant_id = rid AND category_id = c_eggs;
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Roll, English Muffin or Bagel', 1.00, 2 FROM products WHERE restaurant_id = rid AND category_id = c_eggs;

-- Extras — Burgers: Add Avocado 1.25
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Add Avocado', 1.25, 1 FROM products WHERE restaurant_id = rid AND category_id = c_burgers;

-- Extras — Salads: protein add-ons
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Add Grilled Chicken', 5.00, 1 FROM products WHERE restaurant_id = rid AND category_id = c_soups AND price > 10;
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Add Grilled Salmon', 7.00, 2 FROM products WHERE restaurant_id = rid AND category_id = c_soups AND price > 10;
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Add Blackened Shrimp', 7.00, 3 FROM products WHERE restaurant_id = rid AND category_id = c_soups AND price > 10;

-- Extras — Sandwiches/Wraps: substitute sides
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Substitute Onion Rings, Waffle or Sweet Potato Fries', 1.50, 1 FROM products WHERE restaurant_id = rid AND category_id = c_panini;
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Add Avocado', 1.25, 2 FROM products WHERE restaurant_id = rid AND category_id = c_panini;

-- Extras — Triple Decker Clubs: substitute sides
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Substitute Sweet Potato Fries', 1.50, 1 FROM products WHERE restaurant_id = rid AND category_id = c_sandwiches AND price > 15;
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Add Avocado', 1.25, 2 FROM products WHERE restaurant_id = rid AND category_id = c_sandwiches AND price > 15;

-- Extras — Desserts: Pie a la Mode
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'A La Mode', 1.75, 1 FROM products WHERE restaurant_id = rid AND category_id = c_desserts AND name LIKE '%Pie%';

-- Extras — Fruits: Add Ice Cream or Cottage Cheese
INSERT INTO product_extras (product_id, name, price, sort_order)
SELECT id, 'Add Ice Cream or Cottage Cheese', 2.95, 1 FROM products WHERE restaurant_id = rid AND category_id = c_juices AND price < 7;

RAISE NOTICE '✅ Buccaneer menu created successfully! Categories: 26, Products: 250+';

END $$;
