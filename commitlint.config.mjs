export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only changes
        'style', // Changes that don't affect code meaning (formatting, etc)
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf', // Performance improvement
        'test', // Adding or updating tests
        'build', // Changes to build system or dependencies
        'ci', // Changes to CI configuration files and scripts
        'chore', // Other changes that don't modify src or test files
        'revert', // Reverts a previous commit
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'all', // affects everything
        'backend', // Backend/API changes
        'frontend', // Frontend/UI changes
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
    'scope-empty': [1, 'never'], // Warn if scope is missing (but don't fail)
    'subject-case': [2, 'always', 'sentence-case'], // Sentence case for subject
    'subject-empty': [2, 'never'], // Subject is required
    'subject-full-stop': [2, 'never', '.'], // No period at end of subject
    'header-max-length': [2, 'always', 100], // Max 100 chars for header
    'body-leading-blank': [2, 'always'], // Blank line before body
    'body-max-line-length': [0, 'always', 100], // Disabled: auto-generated changelogs have long lines
    'footer-leading-blank': [0, 'always'], // Disabled: auto-generated changelogs don't follow this
  },
};
