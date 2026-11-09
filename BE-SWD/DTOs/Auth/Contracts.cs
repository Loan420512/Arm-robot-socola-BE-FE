using System.ComponentModel.DataAnnotations;
using ChocoRobot.Common;

namespace ChocoRobot.DTOs.Auth;

public record LoginRequest(
    [Required, MaxLength(100)] string Username,
    [Required, MaxLength(ValidationRules.MaximumPasswordBytes)] string Password);

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required, MinLength(ValidationRules.MinimumPasswordLength), MaxLength(ValidationRules.MaximumPasswordBytes)]
    string NewPassword);
public record UserDto(int Id, string? Username, string? Email, string Role);
public record LoginResponse(string AccessToken, string TokenType, int ExpiresIn, UserDto User);
