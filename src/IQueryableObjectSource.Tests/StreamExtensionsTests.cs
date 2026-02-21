using System.IO;
using System.Text;
using IQueryableObjectSource;

namespace IQueryableObjectSource.Tests
{
    public class StreamExtensionsTests
    {
        [Fact]
        public void WriteError_WritesExpectedBinaryFormat()
        {
            // Arrange
            var errorMessage = "Test Error Message";
            using var memoryStream = new MemoryStream();

            // Act
            memoryStream.WriteError(errorMessage);

            // Assert
            memoryStream.Position = 0;
            using var reader = new BinaryReader(memoryStream, Encoding.Default);
            var isError = reader.ReadBoolean();
            var actualMessage = reader.ReadString();

            Assert.True(isError);
            Assert.Equal(errorMessage, actualMessage);
        }

        [Fact]
        public void WriteError_HandlesEmptyMessage()
        {
            // Arrange
            var errorMessage = string.Empty;
            using var memoryStream = new MemoryStream();

            // Act
            memoryStream.WriteError(errorMessage);

            // Assert
            memoryStream.Position = 0;
            using var reader = new BinaryReader(memoryStream, Encoding.Default);
            var isError = reader.ReadBoolean();
            var actualMessage = reader.ReadString();

            Assert.True(isError);
            Assert.Equal(errorMessage, actualMessage);
        }

        [Fact]
        public void WriteSuccess_WritesExpectedBinaryFormat()
        {
             // Arrange
            var data = "Success Data";
            using var memoryStream = new MemoryStream();

            // Act
            memoryStream.WriteSuccess(data);

            // Assert
            memoryStream.Position = 0;
            using var reader = new BinaryReader(memoryStream, Encoding.Default);
            var isError = reader.ReadBoolean();
            var actualData = reader.ReadString();

            Assert.False(isError);
            Assert.Equal(data, actualData);
        }
    }
}
