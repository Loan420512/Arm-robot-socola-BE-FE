using System.Net.Http.Headers;
using System.Text.Json;
using ChocoRobot.Common;
using ChocoRobot.Configuration;
using Microsoft.Extensions.Options;
using SkiaSharp;


namespace ChocoRobot.Services;

public sealed class TemplateImageService(
    IOptions<TemplateImageOptions> options,
    IOptions<CloudinaryOptions> cloudinary,
    IHttpClientFactory httpFactory)
{
    public async Task<string> Upload(IFormFile file, PathString pathBase, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (file.Length == 0 || file.Length > settings.MaxFileBytes)
            throw new ApiException(400, $"Image must contain 1 to {settings.MaxFileBytes} bytes.");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var expected = extension switch { ".png" => "PNG", ".jpg" or ".jpeg" => "JPEG", _ => null };
        var mime = expected == "PNG" ? "image/png" : "image/jpeg";
        if (expected is null || !string.Equals(file.ContentType, mime, StringComparison.OrdinalIgnoreCase))
            throw new ApiException(400, "Only PNG and JPEG images with matching content types are accepted.");

        // Never use the client filename as a storage path. Bound the bytes actually read as well as Length.
        using var input = new MemoryStream();
        await using (var source = file.OpenReadStream())
        {
            var buffer = new byte[81920];
            int read;
            while ((read = await source.ReadAsync(buffer, cancellationToken)) > 0)
            {
                if (input.Length + read > settings.MaxFileBytes)
                    throw new ApiException(400, "Image exceeds the configured size limit.");
                await input.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            }
        }
        input.Position = 0;
        using var codec = SKCodec.Create(input);
        var format = expected == "PNG" ? SKEncodedImageFormat.Png : SKEncodedImageFormat.Jpeg;
        if (codec is null || codec.EncodedFormat != format || codec.Info.Width <= 0 || codec.Info.Height <= 0
            || (long)codec.Info.Width * codec.Info.Height > settings.MaxPixels)
            throw new ApiException(400, "Invalid image content, mismatched format or pixel limit exceeded.");
        using var bitmap = new SKBitmap(new SKImageInfo(codec.Info.Width, codec.Info.Height));
        if (codec.GetPixels(bitmap.Info, bitmap.GetPixels()) != SKCodecResult.Success)
            throw new ApiException(400, "The image is corrupt or incomplete.");
        using var image = SKImage.FromBitmap(bitmap);
        using var encoded = image.Encode(format, 90);
        {
            var cloud = cloudinary.Value;
            if (string.IsNullOrWhiteSpace(cloud.CloudName) || string.IsNullOrWhiteSpace(cloud.UploadPreset))
                throw new ApiException(503, "Cloudinary chưa được cấu hình trên máy chủ.");
            var name = Guid.NewGuid().ToString("N") + (expected == "PNG" ? ".png" : ".jpg");
            var contentType = expected == "PNG" ? "image/png" : "image/jpeg";
            using var form = new MultipartFormDataContent();
            var payload = new ByteArrayContent(encoded.ToArray());
            payload.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            form.Add(payload, "file", name);
            form.Add(new StringContent(cloud.UploadPreset), "upload_preset");
            using var client = httpFactory.CreateClient();
            using var response = await client.PostAsync(
                $"https://api.cloudinary.com/v1_1/{cloud.CloudName}/image/upload", form, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new ApiException(502, "Không tải được ảnh lên Cloudinary.");
            using var document = JsonDocument.Parse(body);
            var secureUrl = document.RootElement.TryGetProperty("secure_url", out var url) ? url.GetString() : null;
            if (string.IsNullOrWhiteSpace(secureUrl))
                throw new ApiException(502, "Cloudinary không trả về đường dẫn ảnh.");
            return secureUrl;
        }
    }
}

