/* @name GetOAuthClientByClientId */
SELECT
  oa.name,
  oa.icon
FROM auth.oauth_application oa
WHERE oa.client_id = :clientId;
