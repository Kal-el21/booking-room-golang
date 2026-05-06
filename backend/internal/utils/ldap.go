package utils

import (
	"crypto/tls"
	"fmt"

	"github.com/Kal-el21/booking-room-golang/backend/internal/config"
	"github.com/go-ldap/ldap/v3"
)

// LDAPUserInfo holds user attributes retrieved from Active Directory
type LDAPUserInfo struct {
	Username string
	Name     string
	Email    string
	Division string
}

// LDAPAuthenticate verifies username & password against Active Directory,
// then returns user attributes on success.
//
// Flow:
//  1. Connect to AD server
//  2. Bind with service account to search the user DN
//  3. Re-bind with the user's own credentials to verify the password
func LDAPAuthenticate(username, password string) (*LDAPUserInfo, error) {
	cfg := config.App.LDAP

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)

	// ── Connect ────────────────────────────────────────────────────────────────
	var conn *ldap.Conn
	var err error

	if cfg.UseSSL {
		tlsCfg := &tls.Config{
			ServerName:         cfg.Host,
			InsecureSkipVerify: cfg.InsecureSkipVerify, //nolint:gosec // flag-controlled
		}
		conn, err = ldap.DialTLS("tcp", addr, tlsCfg)
	} else {
		conn, err = ldap.Dial("tcp", addr)
	}
	if err != nil {
		return nil, fmt.Errorf("gagal terhubung ke LDAP (%s): %w", addr, err)
	}
	defer conn.Close()

	// ── Service-account bind (read-only search) ────────────────────────────────
	if err := conn.Bind(cfg.BindDN, cfg.BindPassword); err != nil {
		return nil, fmt.Errorf("service account bind gagal, periksa LDAP_BIND_DN/PASSWORD: %w", err)
	}

	// ── Search for the user entry ──────────────────────────────────────────────
	// cfg.UserFilter should look like: (sAMAccountName=%s)
	filter := fmt.Sprintf(cfg.UserFilter, ldap.EscapeFilter(username))

	searchReq := ldap.NewSearchRequest(
		cfg.BaseDN,
		ldap.ScopeWholeSubtree,
		ldap.NeverDerefAliases,
		0, 0, false,
		filter,
		[]string{"dn", cfg.AttrName, cfg.AttrEmail, cfg.AttrDivision},
		nil,
	)

	sr, err := conn.Search(searchReq)
	if err != nil {
		return nil, fmt.Errorf("pencarian LDAP gagal: %w", err)
	}

	switch len(sr.Entries) {
	case 0:
		return nil, fmt.Errorf("pengguna tidak ditemukan di direktori")
	case 1:
		// expected — continue below
	default:
		return nil, fmt.Errorf("ditemukan lebih dari satu entri untuk pengguna ini, periksa LDAP_USER_FILTER")
	}

	entry := sr.Entries[0]

	// ── Authenticate user with their own credentials ───────────────────────────
	if err := conn.Bind(entry.DN, password); err != nil {
		return nil, fmt.Errorf("email atau password salah")
	}

	// ── Collect attributes ─────────────────────────────────────────────────────
	name := entry.GetAttributeValue(cfg.AttrName)
	if name == "" {
		name = username // fallback: use the login name
	}

	email := entry.GetAttributeValue(cfg.AttrEmail)
	if email == "" {
		// Some AD setups store UPN as the mail attribute; fall back to
		// username@domain if AttrEmail returns nothing.
		email = fmt.Sprintf("%s@%s", username, cfg.DefaultEmailDomain)
	}

	return &LDAPUserInfo{
		Username: username,
		Name:     name,
		Email:    email,
		Division: entry.GetAttributeValue(cfg.AttrDivision),
	}, nil
}
