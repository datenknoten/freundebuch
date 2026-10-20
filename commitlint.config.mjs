export default {
  extends: ['@datenknoten/commitlint-config'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'all', // affects everything
        'backend', // Backend/API changes
        'frontend', // Frontend/UI changes
        'mcp-server', // MCP server changes
        'shared', // Shared package changes
        'database', // Database migrations/schema changes
        'docs', // Documentation
        'deps', // Dependency updates
        'config', // Configuration files
        'ci', // CI/CD configuration
        'dx', // Developer experience
        'release', // Semantic-release automated commits
      ],
    ],
  },
};
