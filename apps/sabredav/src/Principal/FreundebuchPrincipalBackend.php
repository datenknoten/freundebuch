<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Principal;

use PDO;
use Sabre\DAVACL\PrincipalBackend\AbstractBackend;

/**
 * Principal backend for Freundebuch users.
 *
 * Maps Freundebuch users to DAV principals.
 * Principal URIs follow the format: principals/{email}
 */
class FreundebuchPrincipalBackend extends AbstractBackend
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Returns a list of principals based on a prefix.
     *
     * @param string $prefixPath The prefix to search for
     * @return array List of principal URIs
     */
    public function getPrincipalsByPrefix($prefixPath): array
    {
        if ($prefixPath !== 'principals') {
            return [];
        }

        $stmt = $this->pdo->query('
            SELECT external_id, email
            FROM auth.users
            ORDER BY email
        ');

        $principals = [];
        while ($row = $stmt->fetch()) {
            $principals[] = [
                'uri' => 'principals/' . $row['email'],
                '{DAV:}displayname' => $row['email'],
                '{http://sabredav.org/ns}email-address' => $row['email'],
            ];
        }

        return $principals;
    }

    /**
     * Returns a specific principal by URI.
     *
     * @param string $path The principal URI
     * @return array|null Principal properties or null if not found
     */
    public function getPrincipalByPath($path): ?array
    {
        $parts = explode('/', $path);
        if (count($parts) !== 2 || $parts[0] !== 'principals') {
            return null;
        }

        $email = $parts[1];

        $stmt = $this->pdo->prepare('
            SELECT external_id, email
            FROM auth.users
            WHERE email = :email
        ');
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        return [
            'id' => $row['external_id'],
            'uri' => 'principals/' . $row['email'],
            '{DAV:}displayname' => $row['email'],
            '{http://sabredav.org/ns}email-address' => $row['email'],
        ];
    }

    /**
     * Updates a principal's properties.
     *
     * @param string $path The principal URI
     * @param \Sabre\DAV\PropPatch $propPatch Properties to update
     */
    public function updatePrincipal($path, \Sabre\DAV\PropPatch $propPatch): void
    {
        // Principal updates are not supported - managed via main application
    }

    /**
     * Searches for principals matching specific properties.
     *
     * @param string $prefixPath The prefix to search within
     * @param array $searchProperties Properties to search by
     * @param string $test "allof" or "anyof"
     * @return array Matching principal URIs
     */
    public function searchPrincipals($prefixPath, array $searchProperties, $test = 'allof'): array
    {
        if ($prefixPath !== 'principals') {
            return [];
        }

        $results = [];

        // Search by email
        if (isset($searchProperties['{http://sabredav.org/ns}email-address'])) {
            $email = $searchProperties['{http://sabredav.org/ns}email-address'];

            $stmt = $this->pdo->prepare('
                SELECT email
                FROM auth.users
                WHERE email ILIKE :email
            ');
            $stmt->execute(['email' => '%' . $email . '%']);

            while ($row = $stmt->fetch()) {
                $results[] = 'principals/' . $row['email'];
            }
        }

        // Search by displayname (which is also email)
        if (isset($searchProperties['{DAV:}displayname'])) {
            $name = $searchProperties['{DAV:}displayname'];

            $stmt = $this->pdo->prepare('
                SELECT email
                FROM auth.users
                WHERE email ILIKE :name
            ');
            $stmt->execute(['name' => '%' . $name . '%']);

            while ($row = $stmt->fetch()) {
                $uri = 'principals/' . $row['email'];
                if (!in_array($uri, $results, true)) {
                    $results[] = $uri;
                }
            }
        }

        return $results;
    }

    /**
     * Finds a principal by URI.
     *
     * @param string $uri The principal URI to find
     * @param string $principalPrefix The prefix to search within
     * @return string|null The matching principal URI or null
     */
    public function findByUri($uri, $principalPrefix): ?string
    {
        if (str_starts_with($uri, 'mailto:')) {
            $email = substr($uri, 7);

            $stmt = $this->pdo->prepare('
                SELECT email
                FROM auth.users
                WHERE email = :email
            ');
            $stmt->execute(['email' => $email]);
            $row = $stmt->fetch();

            if ($row) {
                return $principalPrefix . '/' . $row['email'];
            }
        }

        return null;
    }

    /**
     * Returns the list of members for a group principal.
     *
     * @param string $principal The group principal URI
     * @return array Member principal URIs
     */
    public function getGroupMemberSet($principal): array
    {
        // Groups are not supported
        return [];
    }

    /**
     * Returns the list of groups a principal is a member of.
     *
     * @param string $principal The principal URI
     * @return array Group principal URIs
     */
    public function getGroupMembership($principal): array
    {
        // Groups are not supported
        return [];
    }

    /**
     * Updates the members of a group principal.
     *
     * @param string $principal The group principal URI
     * @param array $members New member URIs
     */
    public function setGroupMemberSet($principal, array $members): void
    {
        // Groups are not supported
    }
}
