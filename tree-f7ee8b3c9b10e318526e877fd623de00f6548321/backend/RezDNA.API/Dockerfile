FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/RezDNA.Models/RezDNA.Models.csproj backend/RezDNA.Models/
COPY backend/RezDNA.Data/RezDNA.Data.csproj backend/RezDNA.Data/
COPY backend/RezDNA.API/RezDNA.API.csproj backend/RezDNA.API/
RUN dotnet restore backend/RezDNA.API/RezDNA.API.csproj

COPY backend/ backend/
RUN dotnet publish backend/RezDNA.API/RezDNA.API.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "RezDNA.API.dll"]
