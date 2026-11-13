# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS web
WORKDIR /src/StickerKiosk
COPY StickerKiosk/package.json StickerKiosk/package-lock.json ./
RUN npm ci
COPY StickerKiosk/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS api
WORKDIR /src
COPY BE-SWD/BE-SWD.csproj BE-SWD/
RUN dotnet restore BE-SWD/BE-SWD.csproj
COPY BE-SWD/ BE-SWD/
COPY --from=web /src/StickerKiosk/dist/ BE-SWD/wwwroot/
RUN dotnet publish BE-SWD/BE-SWD.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=api /out/ ./
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "BE-SWD.dll"]
