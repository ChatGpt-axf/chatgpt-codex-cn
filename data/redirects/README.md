# Redirects

Store deployment-specific redirect lists in this directory. Each row or YAML item needs `oldUrl`, `newUrl`, and `type`. Permanent content moves use `301`; temporary routing uses `302`. Redirect sources must not be emitted in the sitemap and must not form chains or loops.
