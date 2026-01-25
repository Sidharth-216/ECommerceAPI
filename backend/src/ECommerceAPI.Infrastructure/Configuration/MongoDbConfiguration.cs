using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Bson.Serialization.Serializers;

namespace ECommerceAPI.Infrastructure.Configuration
{
    public static class MongoDbConfiguration
    {
        private static bool _isConfigured = false;
        private static readonly object _lock = new object();

        public static void Configure()
        {
            if (_isConfigured)
                return;

            lock (_lock)
            {
                if (_isConfigured)
                    return;

                // Set conventions for all collections
                var conventionPack = new ConventionPack
                {
                    // Ignore extra elements in MongoDB that don't exist in C# classes
                    new IgnoreExtraElementsConvention(true),
                    
                    // Use camelCase for element names (MongoDB convention)
                    new CamelCaseElementNameConvention(),
                    
                    // Ignore null values
                    new IgnoreIfNullConvention(true)
                };

                ConventionRegistry.Register(
                    "ECommerceConventions",
                    conventionPack,
                    type => true);

                // Register custom serializers
                BsonSerializer.RegisterSerializer(new DecimalSerializer(BsonType.Decimal128));
                BsonSerializer.RegisterSerializer(new DateTimeSerializer(DateTimeKind.Utc));

                _isConfigured = true;
            }
        }
    }
}