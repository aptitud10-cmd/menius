-- ============================================================
-- BUCCANEER — Add images to all products
-- Restaurant ID: a1f5af6a-1805-49d2-b494-f074ac657357
-- Run AFTER seed-buccaneer.sql in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  rid UUID := 'a1f5af6a-1805-49d2-b494-f074ac657357';
BEGIN

-- ═══════════════════════════════════════════
-- JUICES & FRUITS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Orange Juice';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Grapefruit Juice';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1576673442511-7e39b6545c87?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Apple Juice';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Tomato or V-8 Juice';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544252890-c8e1a1b7e8e2?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Hawaiian Pineapple Juice';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Cranberry Juice';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1564093497595-593b96d80180?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fresh Fruit Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587049016823-69ef9d68f812?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chilled Half Large Grapefruit';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fresh Melon';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fresh Berries';

-- ═══════════════════════════════════════════
-- FARM FRESH EGGS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Two Eggs, Any Style';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Two Eggs with Ham%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Two Eggs with Turkey Bacon';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Two Eggs with Canadian Bacon';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Corned Beef Hash%';

-- ═══════════════════════════════════════════
-- OMELETTES
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Cheese Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612240498936-65f5101365d2?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Pastrami%Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Ham, Bacon%Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Ham & Cheese Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612240498936-65f5101365d2?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Western Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fresh Mushroom Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612240498936-65f5101365d2?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Garden Vegetable Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612240498936-65f5101365d2?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Nova Scotia%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612240498936-65f5101365d2?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Mediterranean Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fajita Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Mexican Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612240498936-65f5101365d2?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Farmers Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chorizo Avocado Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612240498936-65f5101365d2?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Avocado Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Greek Omelette';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612240498936-65f5101365d2?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Low Cholesterol%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Chili Con Carne%';

-- ═══════════════════════════════════════════
-- BENEDICTS & BRUNCH
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1608039829572-9b1234ef0d3e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Classic Benedict';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1608039829572-9b1234ef0d3e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Smoked Salmon Benedict';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1608039829572-9b1234ef0d3e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Crab Cakes Benedict';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE '1/2 Romanian%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Avocado Toast';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Avocado Toast with%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Greek Yogurt%';

-- ═══════════════════════════════════════════
-- PANCAKES
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Golden Brown Buttermilk Pancakes';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Pancakes with Ham%Sausage';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Pancakes with Canadian%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Pancakes with Two Eggs, Any Style';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Silver Dollar Pancakes' AND name NOT LIKE '%Ham%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Silver Dollar Pancakes with%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Pancakes with Fresh Fruit%' AND name NOT LIKE '%Ham%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Pancakes with Fresh Fruit%Ham%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1590137876181-2a5a7e340308?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Banana Pecan Pancakes' AND name NOT LIKE '%Ham%' AND name NOT LIKE '%Turkey%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1590137876181-2a5a7e340308?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Banana Pecan Pancakes with%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1590137876181-2a5a7e340308?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Banana Pecan Pancakes with Turkey%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chocolate Chip Pancakes';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Coconut Pancakes';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Lumberjack';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Oreo Pancakes';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Healthy Greek Pancakes';

-- ═══════════════════════════════════════════
-- FRENCH TOAST
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Old Fashioned French Toast';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Challah Bread%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'French Toast with Ham%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'French Toast with Canadian%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'French Toast with Two%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'French Toast with Fresh%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'French Toast Deluxe';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Apple Crisp%';

-- ═══════════════════════════════════════════
-- WAFFLES
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Belgian Waffle';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Belgian Waffle with Ham%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Belgian Waffle with Canadian%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Belgian Waffle with Two%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Belgian Waffle with Fresh%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1619683548293-a8da8ac7f33f?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fried Chicken N%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Nutella Waffle';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Belgian Waffle Sundae';

-- ═══════════════════════════════════════════
-- BAGELS & BAKERY
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1585445490387-f47934b73b54?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Hand-Rolled%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1585445490387-f47934b73b54?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Bagel with Butter';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1585445490387-f47934b73b54?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Bagel with Cream Cheese';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1627308595171-d1b5d67129c4?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Bagel with Smoked Salmon' AND name NOT LIKE '%Cream%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1627308595171-d1b5d67129c4?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Bagel with Smoked Salmon, Cream%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1627308595171-d1b5d67129c4?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'The New Yorker Bagel';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Buttered Roll';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1558303926-f4c8e5e33d99?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Homemade Muffin';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1585445490387-f47934b73b54?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Jumbo English Muffin';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509365390695-33aee754301f?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Danish Pastry%' AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Bagels & Bakery');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Croissant';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Assorted Dry Cereals%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Cereal with Raisins';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Cereal with Seasonal%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Old Fashioned Hot Oatmeal%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Oatmeal with Raisins%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Oatmeal with Seasonal%';

-- ═══════════════════════════════════════════
-- BREAKFAST WRAPS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chorizo & Eggs';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Southwestern Burrito';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Mexi-Cali%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'South of the Border%';

-- ═══════════════════════════════════════════
-- BURGERS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Beef Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Cheeseburger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Swiss, Cheddar%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Bacon Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Bacon Cheeseburger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Pizza Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Mushroom Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Ranch Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Texas Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Turkey Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1520072959219-c595e6cdc07e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Veggie Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Western Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Mexican Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Portobello Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Alpine Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Reuben Pastrami Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Roadhouse Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'BBQ Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Cowboy Burger';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chili Cheeseburger';

-- ═══════════════════════════════════════════
-- SANDWICHES
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Corned Beef or Pastrami%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Roast Turkey Sandwich';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Roast Beef Sandwich';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Roast Virginia Ham%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Grilled Chicken Breast Sandwich';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Boiled Ham Sandwich';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'BLT';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Ham & American%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Ham & Swiss%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1481070555726-e2fe8357725c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fresh Mozzarella%';
-- Cheese sandwiches - use grilled cheese image
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE '%Cheese Sandwich' AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Sandwiches');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Grilled American%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Grilled Cheese%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Grilled Swiss%';
-- Salad sandwiches
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Chicken Salad Sandwich';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Tuna Fish%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Shrimp Salad Sandwich';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Daily Made%';
-- Fish & Egg
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fried Tilapia Filet Sandwich';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fried Filet of Sole Sandwich';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fried Eggs%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Western Egg Sandwich';
-- Monte Cristo
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Monte Cristo';
-- Hot Open
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Hot Open%';
-- Triple Decker Clubs
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE '%Club';

-- ═══════════════════════════════════════════
-- CHICKEN SANDWICHES
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Chicken Sandwiches');

-- ═══════════════════════════════════════════
-- PANINI & WRAPS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Panini & Wraps');

-- ═══════════════════════════════════════════
-- SOUPS & SALADS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Soup of the Day';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chili';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Greek Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Strawberry Fields Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Caesar Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Santa Fe Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Mediterranean Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Chef%Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Steak Bistro%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'BBQ Ranch%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'West Coast%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Taco Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Cobb Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Chopped Buffalo%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Crispy Greens%';
-- Cold Salad Platters
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE '%Platter' AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Soups & Salads');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Stuffed California%';

-- ═══════════════════════════════════════════
-- APPETIZERS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'The Sampler';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1548340748-6d2b7d7da280?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Stuffed Mushrooms%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1548340748-6d2b7d7da280?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Clams Casino';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1548340748-6d2b7d7da280?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Mini Crab Cakes';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fried Calamari' AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Appetizers');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Mini Taco';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1548340748-6d2b7d7da280?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Mediterranean Style%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Potato Skins';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Disco Fries';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Greek Fries';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Mozzarella Sticks';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1548340748-6d2b7d7da280?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Jalapeno Poppers';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1527477396000-e27163b60a61?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Buffalo Wings';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chicken Tenders';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Chicken or Pulled%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Loaded Nachos%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Guacamole Dip';

-- ═══════════════════════════════════════════
-- ENTREES & STEAKS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Sliced Prime%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Roast Virginia Ham' AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Entrees & Steaks');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1619683548293-a8da8ac7f33f?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fried Chicken';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Chopped Sirloin%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE '2 Thick Cut%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'N.Y. Cut%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Romanian Tenderloin%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'St. Louis%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Porterhouse%';

-- ═══════════════════════════════════════════
-- SEAFOOD
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Twin%Lobster%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565680018093-ebb6505f0a3c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Jumbo Shrimp%Broiled';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565680018093-ebb6505f0a3c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Shrimp Scampi%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Deep Sea Scallops';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Filet of Sole Broiled';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Whole Flounder';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Atlantic Salmon Filet';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Tilapia Filet Broiled';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fried Calamari Dinner';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fried Filet of Sole';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fried Scallops';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565680018093-ebb6505f0a3c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fried Jumbo Shrimp%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Seafood Combination';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fried Tilapia';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Stuffed Filet%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Stuffed Salmon%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Stuffed Clams';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Stuffed Tilapia%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565680018093-ebb6505f0a3c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Stuffed Shrimp';

-- ═══════════════════════════════════════════
-- ITALIAN & PASTA
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Linguine with Meatballs';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Linguine with Tomato%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Meat Ravioli';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Cheese Ravioli';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fried Calamari with%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Eggplant Parmigiana';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fried Shrimp Parm%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Chicken Cutlet Parm%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Mac N%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Penne Pasta%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Pasta Da Vinci';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fettuccine Alfredo';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chicken Primavera';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Salmon Saute%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Linguine Aglio%';

-- ═══════════════════════════════════════════
-- GREEK CORNER
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Greek Corner');

-- ═══════════════════════════════════════════
-- SIGNATURE DISHES
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fisherman%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Mariner%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Sea & Land';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Beef & Reef';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Surf & Turf';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Steak & Shrimp%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Skirt Steak%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Frutti Di%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Crispy Salmon';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chicken Francaise';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Chicken Cordon Bleu' AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Signature Dishes');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Chicken Breast Saute';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Tilapia Francaise';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chicken Marsala';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chicken Piccata';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565680018093-ebb6505f0a3c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Shrimp Francaise';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Buccaneer Combination';

-- ═══════════════════════════════════════════
-- SIDE ORDERS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'French Fries' AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Side Orders');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Loaded French Fries';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Waffle Fries';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1604497181015-76590d828b75?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Sweet Potato Fries';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fried Plantains%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Onion Rings';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Lettuce & Tomato Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Tossed Salad';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Bacon, Sausage%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Turkey Bacon or%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Corned Beef Hash' AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Side Orders');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Baked Potato';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Stuffed Baked%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Cole Slaw%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Cottage Cheese';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Vegetable of the Day';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Broccoli with%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Feta Cheese';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Tzatziki%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Guacamole' AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Side Orders');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Sliced Avocado';

-- ═══════════════════════════════════════════
-- COCKTAILS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Cocktails') AND name IN ('Sea Breeze','Bay Breeze','Sex on the Beach','Woo Woo','Fuzzy Navel','Melon Ball');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Cocktails') AND name IN ('Singapore Sling','Sloe Gin Fizz','Tom Collins','Kamikaze','Casa Blanca');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Cocktails') AND name IN ('Toasted Almond','Brandy Alexander','Golden Cadillac','White Russian','Black Russian','Godfather');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Cocktails') AND name IN ('Whiskey Sour','Apricot Sour','Alabama Slammer');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Cocktails') AND name IN ('Zombie','L.I. Iced Tea');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1550426735-c33c7ce414ff?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Cocktails') AND name LIKE '%Daiquiri%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1550426735-c33c7ce414ff?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Cocktails') AND name LIKE 'Virgin Daiquiri';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587223962217-f4e4612dae5c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Chi-Chi';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587223962217-f4e4612dae5c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Blue Hawaiian';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Mimosa';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587223962217-f4e4612dae5c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Pina Colada';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587223962217-f4e4612dae5c?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Virgin Pina%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Planter%';

-- ═══════════════════════════════════════════
-- SMOOTHIES & BEVERAGES
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE '%Smoothie%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Assorted Sodas%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1560023907-5f339617ea55?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Seltzer Water';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Lemonade';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Milk';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chocolate Milk';

-- ═══════════════════════════════════════════
-- COFFEE & HOT DRINKS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Coffee%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Fresh Brewed Decaf%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Tea';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Assorted Herbal%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Decaf Tea';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Hot Chocolate%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Espresso';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Cappuccino';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Cafe Latte';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Hot Mochaccino';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Frappe%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Iced Coffee%';

-- ═══════════════════════════════════════════
-- DESSERTS
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chocolate Layer Cake';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Coconut Lemon Layer Cake';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Strawberry Short Cake';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Carrot Cake';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1524351199432-c3594e31a048?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Plain Cheesecake%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1524351199432-c3594e31a048?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Fruit Cheesecake';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1524351199432-c3594e31a048?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chocolate Cheesecake';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Lemon Meringue Pie';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chocolate Mousse';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'All Pound Cakes';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509365390695-33aee754301f?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Greek Pastries';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1509365390695-33aee754301f?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Danish Pastry%' AND category_id IN (SELECT id FROM categories WHERE restaurant_id = rid AND name = 'Desserts');
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Rice Pudding';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Jello%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Brownies';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Chocolate Chip Cookies';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Apple Pie';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Apple Crumb Pie';

-- ═══════════════════════════════════════════
-- ICE CREAM & FOUNTAIN
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Ice Cream Soda';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Milk Shake';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Oreo Cookie Shake';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Nutella Banana Shake';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Double Rich%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Egg Cream';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Brownie All%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Ice Cream (Two%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Sundaes%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name LIKE 'Sundae with%';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=600&fit=crop&q=80' WHERE restaurant_id = rid AND name = 'Banana Split';

-- ═══════════════════════════════════════════
-- CATCH-ALL: any remaining products without images
-- ═══════════════════════════════════════════
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=600&fit=crop&q=80'
WHERE restaurant_id = rid AND (image_url IS NULL OR image_url = '');

RAISE NOTICE '✅ Buccaneer images added to all products!';

END $$;
