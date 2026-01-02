<?php

declare(strict_types=1);

namespace Freundebuch\DAV\Logging;

/**
 * Simple logger for CardDAV server
 * Logs to stderr for Docker container compatibility
 */
class Logger
{
    private const LEVELS = [
        'trace' => 0,
        'debug' => 1,
        'info' => 2,
        'warn' => 3,
        'error' => 4,
        'fatal' => 5,
    ];

    private string $level;
    private int $levelValue;
    private ?string $requestId;

    public function __construct(string $level = 'info', ?string $requestId = null)
    {
        $this->level = strtolower($level);
        $this->levelValue = self::LEVELS[$this->level] ?? self::LEVELS['info'];
        $this->requestId = $requestId ?? $this->generateRequestId();
    }

    private function generateRequestId(): string
    {
        return bin2hex(random_bytes(8));
    }

    public function getRequestId(): string
    {
        return $this->requestId;
    }

    private function shouldLog(string $level): bool
    {
        $targetLevel = self::LEVELS[$level] ?? self::LEVELS['info'];
        return $targetLevel >= $this->levelValue;
    }

    private function log(string $level, string $message, array $context = []): void
    {
        if (!$this->shouldLog($level)) {
            return;
        }

        $logEntry = [
            'level' => $level,
            'time' => date('c'),
            'requestId' => $this->requestId,
            'msg' => $message,
        ];

        if (!empty($context)) {
            $logEntry = array_merge($logEntry, $context);
        }

        // Write JSON to stderr for structured logging
        error_log(json_encode($logEntry, JSON_UNESCAPED_SLASHES));
    }

    public function trace(string $message, array $context = []): void
    {
        $this->log('trace', $message, $context);
    }

    public function debug(string $message, array $context = []): void
    {
        $this->log('debug', $message, $context);
    }

    public function info(string $message, array $context = []): void
    {
        $this->log('info', $message, $context);
    }

    public function warn(string $message, array $context = []): void
    {
        $this->log('warn', $message, $context);
    }

    public function error(string $message, array $context = []): void
    {
        $this->log('error', $message, $context);
    }

    public function fatal(string $message, array $context = []): void
    {
        $this->log('fatal', $message, $context);
    }
}
