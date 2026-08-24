# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Multi-instance support: config file can be an array of bot configurations.
- `commander`-based CLI with `--version` / `--help` flags.
- `botName` is now automatically fetched from the Telegram API (`getMe()`).
- Log messages now include `[@botUsername] [chatName]` prefix for multi-instance clarity.

### Changed

- Extracted config loading helpers into `src/config.ts`.
- Merged duplicate `Config` interface with `TelespamOptions`.
- Log messages use hardcoded English instead of i18n translations.

### Removed

- Removed `botName` from config options (auto-detected via API).

## [0.2.0] - 2024-06-10

### Added

- Daily statistics reports sent to each group at midnight.
- Blacklist split into `nameKeywordBlacklist` and `bioKeywordBlacklist`.

### Fixed

- Full name composition (`first_name` + `last_name`).

## [0.1.1] - 2024-06-06

### Fixed

- Build output configuration.

## [0.1.0] - 2024-06-06

### Added

- Automatic chat join request review with configurable rules.
- `requireProfilePhoto` — reject users without a profile photo.
- `autoApprove` — auto-approve join requests that pass all rules.
- Name & bio keyword blacklist filtering.
- Verification question with inline keyboard and timeout.
- i18n support (English & Chinese).
- Decline notification sent to group with masked user info.
- systemd user service `install` / `uninstall` / `status` commands.
