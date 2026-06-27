-- Permite al driver leer su propio row en la tabla drivers via JWT
CREATE POLICY "driver_read_own_row"
  ON drivers FOR SELECT
  USING (auth_user_id = auth.uid());

-- Permite al driver leer órdenes que tiene asignadas
CREATE POLICY "driver_read_assigned_orders"
  ON orders FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE auth_user_id = auth.uid()
    )
  );
