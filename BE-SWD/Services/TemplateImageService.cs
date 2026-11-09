using ChocoRobot.Common;
using ChocoRobot.Configuration;
using Microsoft.Extensions.Options;
using SkiaSharp;


namespace ChocoRobot.Services;

public sealed class TemplateImageService(IOptions<TemplateImageOptions> options, IWebHostEnvironment environment)
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
            // Re-encode pixels only: discard metadata, appended payloads and original filenames.
            var directory = Path.GetFullPath(settings.StoragePath, environment.ContentRootPath);
            Directory.CreateDirectory(directory);
            var name = Guid.NewGuid().ToString("N") + (expected == "PNG" ? ".png" : ".jpg");
            var destination = Path.Combine(directory, name);
            try
            {
                await using var output = new FileStream(destination, FileMode.CreateNew, FileAccess.Write, FileShare.None);
                await output.WriteAsync(encoded.ToArray(), cancellationToken);
            }
            catch
            {
                File.Delete(destination);
                throw;
            }
            // A relative public URL is host independent and fits the existing database field.
            return $"{pathBase}{settings.RequestPath}/{name}";
        }
    }
}

