<?php
class TwoFactorAuthLight
{
    public function createSecret(int $length = 16): string
    {
        $chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        for ($i = 0; $i < $length; $i++) {
            $secret .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $secret;
    }

    public function getQRCodeUrl(string $label, string $secret, string $issuer = 'Bricksy'): string
    {
        return 'otpauth://totp/' . rawurlencode($label)
            . '?secret='   . rawurlencode($secret)
            . '&issuer='   . rawurlencode($issuer)
            . '&algorithm=SHA1&digits=6&period=30';
    }

    public function getCode(string $secret, ?int $timeSlice = null): string
    {
        if ($timeSlice === null) {
            $timeSlice = (int) floor(time() / 30);
        }
        $key = $this->base32Decode($secret);
        if ($key === '') return '000000';

        $time   = pack('N*', 0) . pack('N*', $timeSlice);
        $hm     = hash_hmac('sha1', $time, $key, true);
        $offset = ord(substr($hm, -1)) & 0x0F;
        $part   = substr($hm, $offset, 4);
        $value  = unpack('N', $part)[1] & 0x7FFFFFFF;
        return str_pad((string)($value % 1_000_000), 6, '0', STR_PAD_LEFT);
    }

    public function verifyCode(string $secret, string $code, int $window = 1): bool
    {
        $code = preg_replace('/\D/', '', $code ?? '');
        if (strlen($code) !== 6) return false;
        $current = (int) floor(time() / 30);
        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals($this->getCode($secret, $current + $i), $code)) return true;
        }
        return false;
    }

    private function base32Decode(string $secret): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret   = strtoupper(trim($secret));
        $secret   = preg_replace('/[^A-Z2-7]/', '', $secret);
        if ($secret === '') return '';
        $bits = '';
        $len  = strlen($secret);
        for ($i = 0; $i < $len; $i++) {
            $val = strpos($alphabet, $secret[$i]);
            if ($val === false) continue;
            $bits .= str_pad(decbin($val), 5, '0', STR_PAD_LEFT);
        }
        $binary = '';
        for ($i = 0; $i + 8 <= strlen($bits); $i += 8) {
            $binary .= chr(bindec(substr($bits, $i, 8)));
        }
        return $binary;
    }
}