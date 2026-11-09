#:package BCrypt.Net-Next@4.2.0
#:property PublishAot=false

using System;
using System.Text;

// Công cụ local độc lập; không kết nối SQL hoặc thay đổi cấu hình Backend.
const int workFactor = 12;
const int maximumPasswordBytes = 72;

try
{
    var password = ReadPassword();
    if (string.IsNullOrEmpty(password))
    {
        throw new ArgumentException("Password must not be empty.");
    }

    if (Encoding.UTF8.GetByteCount(password) > maximumPasswordBytes)
    {
        throw new ArgumentException("Password must not exceed 72 UTF-8 bytes.");
    }

    var hash = BCrypt.Net.BCrypt.HashPassword(password, workFactor);
    if (!BCrypt.Net.BCrypt.Verify(password, hash))
    {
        throw new InvalidOperationException("Generated hash did not pass BCrypt verification.");
    }

    // Chỉ hash được in ra stdout để người dùng tự cập nhật SQL Server.
    Console.WriteLine(hash);
    Console.Error.WriteLine($"BCrypt verification passed. WorkFactor={workFactor}; hash length={hash.Length}.");
    return 0;
}
catch (Exception exception)
{
    Console.Error.WriteLine(exception.Message);
    return 1;
}

static string ReadPassword()
{
    if (Console.IsInputRedirected)
    {
        return Console.ReadLine() ?? string.Empty;
    }

    Console.Error.Write("Local test password (hidden): ");
    var password = new StringBuilder();

    while (true)
    {
        var key = Console.ReadKey(intercept: true);
        if (key.Key == ConsoleKey.Enter)
        {
            Console.Error.WriteLine();
            return password.ToString();
        }

        if (key.Key == ConsoleKey.Escape)
        {
            throw new OperationCanceledException("Password entry cancelled.");
        }

        if (key.Key == ConsoleKey.Backspace)
        {
            if (password.Length > 0)
            {
                password.Length--;
            }

            continue;
        }

        if (!char.IsControl(key.KeyChar))
        {
            password.Append(key.KeyChar);
        }
    }
}
