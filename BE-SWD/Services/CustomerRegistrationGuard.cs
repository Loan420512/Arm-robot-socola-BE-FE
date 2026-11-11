using System.Security.Cryptography;
using System.Text;
using ChocoRobot.Common;
using ChocoRobot.Configuration;
using ChocoRobot.DTOs.Customer;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace ChocoRobot.Services;

// Process-local, bounded cache. Never stores raw contact details or queries existing customers.
public sealed class CustomerRegistrationGuard(IOptions<CustomerRegistrationOptions> options) : IDisposable
{
    private readonly MemoryCache recent = new(new MemoryCacheOptions { SizeLimit = 10000 });
    private readonly object gate = new();
    public void Check(CreateRequest request)
    {
        var key = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(
            request.Phone!.Trim() + "\n" + request.Email!.Trim().ToUpperInvariant())));
        lock (gate)
        {
            if (recent.TryGetValue(key, out _))
                throw new ApiException(429, "Please wait before submitting again.");
            recent.Set(key, true, new MemoryCacheEntryOptions
            {
                Size = 1, AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(options.Value.DuplicateCooldownSeconds)
            });
        }
    }
    public void Dispose() => recent.Dispose();
}
