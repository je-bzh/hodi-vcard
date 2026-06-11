-- ============================================================================
-- Cleanup : supprimer les wallpapers DEFAULT (Hodi) dupliqués
-- ============================================================================
-- Contexte :
--   Avant le fix idempotent dans handle_wallpapers_create, plusieurs defaults
--   ont pu être insérés pour une même vcard (race condition lors du bootstrap
--   de mes-fonds ou lors de la création de la vCard si la 1re tentative a
--   failed sans rollback côté UI).
--
--   Conséquence : la count("WHERE vcard_id = ?") devient > max_wallpapers, et
--   l'user voit "Limite atteinte" même après avoir supprimé un perso.
--
-- Stratégie :
--   - On garde le PLUS ANCIEN default par vcard (created_at ASC, id ASC) et on
--     supprime les autres rows is_default = 1.
--   - Les fichiers de storage des defaults supprimés deviennent orphelins mais
--     ce n'est pas critique : ce sont les mêmes images générées (QR + bg Hodi),
--     juste répétées. Un GC séparé peut les nettoyer si besoin.
--
-- À exécuter :
--   En prod, depuis cPanel terminal :
--     mysql -u <user> -p <db> < db/cleanup-duplicate-defaults.sql
--   En local (Mac + MariaDB) :
--     mysql -uroot -proot hodi_vcard < db/cleanup-duplicate-defaults.sql
-- ============================================================================

-- 1. Compte avant
SELECT 'AVANT — vcards avec >1 default' AS info,
       v.id AS vcard_id, v.slug,
       COUNT(*) AS nb_defaults
  FROM wallpapers w
  JOIN vcards v ON v.id = w.vcard_id
 WHERE w.is_default = 1
 GROUP BY v.id, v.slug
HAVING COUNT(*) > 1;

-- 2. Cleanup : pour chaque vcard avec plusieurs defaults, on garde le plus ancien
--    (ORDER BY created_at ASC, id ASC pour déterminisme) et on supprime le reste.
DELETE w FROM wallpapers w
JOIN (
    SELECT id
      FROM (
          SELECT id, vcard_id, created_at,
                 ROW_NUMBER() OVER (PARTITION BY vcard_id ORDER BY created_at ASC, id ASC) AS rn
            FROM wallpapers
           WHERE is_default = 1
      ) ranked
     WHERE rn > 1
) dupes ON dupes.id = w.id;

-- 3. Compte après
SELECT 'APRÈS — total wallpapers par vcard' AS info,
       v.id AS vcard_id, v.slug,
       COUNT(*) AS nb_total,
       SUM(w.is_default) AS nb_defaults
  FROM wallpapers w
  JOIN vcards v ON v.id = w.vcard_id
 GROUP BY v.id, v.slug
 ORDER BY nb_total DESC;
