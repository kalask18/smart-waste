-- SmartWaste Supabase Auth User Trigger (Automatic Profile Creation & Role Sanitization)

-- Function: Automatically creates a profile record when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  user_name TEXT;
  user_phone TEXT;
  user_area UUID;
BEGIN
  -- Extract raw metadata passed during signup
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
  user_phone := NEW.raw_user_meta_data->>'phone';
  
  -- Parse area_id safely
  IF (NEW.raw_user_meta_data->>'area_id') IS NOT NULL AND (NEW.raw_user_meta_data->>'area_id') != '' THEN
    user_area := (NEW.raw_user_meta_data->>'area_id')::uuid;
  ELSE
    user_area := NULL;
  END IF;

  -- SANITIZATION RULE: Public signup can ONLY request 'citizen' or 'driver'.
  -- If someone tries to pass 'admin' in raw_user_meta_data during public signup, force it to 'citizen'.
  assigned_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'));
  IF assigned_role NOT IN ('citizen', 'driver') THEN
    assigned_role := 'citizen';
  END IF;

  -- Insert profile record
  INSERT INTO public.profiles (id, full_name, phone, role, area_id, created_at)
  VALUES (NEW.id, user_name, user_phone, assigned_role, user_area, NOW())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Execute function after new user creation in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
