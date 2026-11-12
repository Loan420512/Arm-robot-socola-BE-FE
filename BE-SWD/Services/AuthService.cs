using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ChocoRobot.Configuration;
using ChocoRobot.DTOs.Auth;
using ChocoRobot.Interfaces.Repositories;
using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ChocoRobot.Services;

public class AuthService(
    IRepository<Admin> repository,
    IConfiguration configuration,
    BusinessRules businessRules,
    IOptions<JwtOptions> jwtOptions,
    IOptions<SecurityOptions> securityOptions)
{
    public static UserDto User(Admin admin)
    {
        return new UserDto(admin.Id, admin.Username, admin.Email, SystemRoles.Admin);
    }

    private static bool Verify(string password, string? hash)
    {
        if (string.IsNullOrEmpty(hash) || Encoding.UTF8.GetByteCount(password) > ValidationRules.MaximumPasswordBytes)
        {
            return false;
        }

        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            return false;
        }
    }

    public async Task<LoginResponse> Login(LoginRequest request)
    {
        var admin = await repository.Query().SingleOrDefaultAsync(account => account.Username == request.Username);
        if (admin?.Role != SystemRoles.Admin || !Verify(request.Password, admin.PasswordHash))
        {
            throw new ApiException(StatusCodes.Status401Unauthorized, ApiMessages.InvalidCredentials);
        }

        var jwt = jwtOptions.Value;
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()),
            new Claim(ClaimTypes.Name, admin.Username!),
            new Claim(ClaimTypes.Role, SystemRoles.Admin),
            new Claim(AuthDefinitions.UserIdClaim, admin.Id.ToString()),
            new Claim(AuthDefinitions.UsernameClaim, admin.Username!),
            new Claim(AuthDefinitions.RoleClaim, SystemRoles.Admin)
        };
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            jwt.Issuer,
            jwt.Audience,
            claims,
            expires: DateTime.UtcNow.AddSeconds(jwt.LifetimeSeconds),
            signingCredentials: credentials);
        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

        return new LoginResponse(accessToken, AuthDefinitions.BearerScheme, jwt.LifetimeSeconds, User(admin));
    }

    public async Task<UserDto> Me()
    {
        var admin = await repository.Query()
            .SingleOrDefaultAsync(account => account.Id == businessRules.UserId && account.Role == SystemRoles.Admin)
            ?? throw new ApiException(StatusCodes.Status401Unauthorized, "Account unavailable");

        return User(admin);
    }

    public async Task Change(ChangePasswordRequest request)
    {
        var admin = await repository.Find(businessRules.UserId)
            ?? throw new ApiException(StatusCodes.Status401Unauthorized, "Account unavailable");
        if (!Verify(request.CurrentPassword, admin.PasswordHash))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Current password is incorrect");
        }

        ValidatePassword(request.NewPassword);
        admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, securityOptions.Value.BcryptWorkFactor);
        await repository.Save();
    }

    private static void ValidatePassword(string password)
    {
        var isTooShort = password.Length < ValidationRules.MinimumPasswordLength;
        var exceedsByteLimit = Encoding.UTF8.GetByteCount(password) > ValidationRules.MaximumPasswordBytes;
        if (isTooShort || exceedsByteLimit)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Password must satisfy the configured BCrypt length rules");
        }
    }

    public async Task Seed()
    {
        var username = configuration["Bootstrap:Username"];
        var password = configuration["Bootstrap:Password"];
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        ValidatePassword(password);
        var request = new DTOs.Admin.CreateRequest
        {
            Username = username,
            Password = password,
            Email = configuration["Bootstrap:Email"]
        };
        System.ComponentModel.DataAnnotations.Validator.ValidateObject(
            request,
            new System.ComponentModel.DataAnnotations.ValidationContext(request),
            validateAllProperties: true);

        // Chỉ seed tài khoản đầu tiên khi bảng ADMIN chưa có dữ liệu.
        await using var transaction = await repository.Begin();
        if (!await repository.Query().AnyAsync())
        {
            var admin = new Admin
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, securityOptions.Value.BcryptWorkFactor),
                Role = SystemRoles.Admin,
                Email = request.Email
            };
            repository.Add(admin);
            await repository.Save();
        }

        await transaction.CommitAsync();
    }
}
