<?php
defined('ROOT') || exit;
/**
 * @var mixed $d
 * @var mixed $me
 * @var mixed $a
 * @var mixed $j
 */
if (str_starts_with($a, 'adm_')) {
    if (!is_admin() || !hash_equals($_SESSION['csrf'] ?? '', $_POST['t'] ?? '')) redirect_to_page('home');
    $who = strtolower($_POST['u'] ?? '');
    $self = strtolower($me['email']);
    foreach ($d['users'] as $j => $u) if (strtolower($u['email']) == $who && $who != $self) {
        if ($a == 'adm_role') {
            $adm = ($u['role'] ?? '') === 'admin';
            $d['users'][$j]['role'] = $adm ? 'user' : 'admin';
            add_audit_entry($d, $adm ? 'Removed admin access from' : 'Made admin', $u['name']);
            $_SESSION['flash'] = 'Role updated';
        }
        if ($a == 'adm_status') {
            $sus = ($u['status'] ?? '') === 'suspended';
            $d['users'][$j]['status'] = $sus ? 'active' : 'suspended';
            add_audit_entry($d, $sus ? 'Reactivated' : 'Suspended', $u['name']);
            $_SESSION['flash'] = $sus ? 'Account reactivated' : 'Account suspended';
        }
        if ($a == 'adm_user') {
            delete_upload($u['avatar'] ?? '');
            delete_upload($u['banner'] ?? '');
            foreach ($d['letters'] as $l) if (strtolower($l['owner']) == $who) delete_upload($l['front'] ?? '');
            $d['letters'] = array_values(array_filter($d['letters'], fn($l) => strtolower($l['owner']) != $who));
            unset($d['users'][$j]);
            $d['users'] = array_values($d['users']);
            add_audit_entry($d, 'Deleted account of', $u['name']);
            $_SESSION['flash'] = 'Account deleted';
        }
        break;
    }
    if ($a == 'adm_set') {
        $d['settings']['signups'] = isset($_POST['signups']) ? 1 : 0;
        add_audit_entry($d, 'Turned new sign-ups ' . ($d['settings']['signups'] ? 'on' : 'off'));
        $_SESSION['flash'] = 'Settings saved';
    }
    save_data($d);
    redirect_to_page('admin&v=' . preg_replace('/\W/', '', $_POST['v'] ?? 'overview'));
}
