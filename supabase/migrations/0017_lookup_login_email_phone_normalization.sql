-- 0017_lookup_login_email_phone_normalization.sql
--
-- Safe Phone & Email Lookup RPC for Login and Password Recovery
-- Normalizes Indian phone number formats (e.g. 9030196547, +919030196547, 919030196547)
-- without altering existing database records or exposing auth tables.

CREATE OR REPLACE FUNCTION public.lookup_login_email(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  ident   text := lower(trim(coalesce(p_identifier, '')));
  digits  text := regexp_replace(ident, '\D', '', 'g');
  last10  text := CASE WHEN length(digits) >= 10 THEN right(digits, 10) ELSE '' END;
  matches text[];
BEGIN
  IF ident = '' THEN
    RETURN NULL;
  END IF;

  -- Direct email match
  IF ident LIKE '%@%' THEN
    SELECT array_agg(email) INTO matches
    FROM (
      SELECT email FROM public.profiles WHERE lower(email) = ident LIMIT 2
    ) m;
    IF array_length(matches, 1) = 1 THEN
      RETURN matches[1];
    END IF;
  END IF;

  -- Phone number or username match (normalized 10-digit comparison)
  SELECT array_agg(email) INTO matches
  FROM (
    SELECT email
    FROM public.profiles
    WHERE lower(phone) = ident
       OR lower(username) = ident
       OR (last10 <> '' AND right(regexp_replace(phone, '\D', '', 'g'), 10) = last10)
    LIMIT 2
  ) m;

  IF array_length(matches, 1) = 1 THEN
    RETURN matches[1];
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_login_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_login_email(text) TO anon, authenticated;
