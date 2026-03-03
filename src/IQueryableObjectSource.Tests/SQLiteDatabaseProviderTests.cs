using System.Collections.Generic;
using System.Linq;
using System.Text;
using IQueryableObjectSource;

namespace IQueryableObjectSource.Tests
{
    public class SQLiteDatabaseProviderTests
    {
        [Fact]
        public void BuildIndentedPlanHtml_Correctness()
        {
            // Arrange
            var items = new List<(int id, int parent, string detail)>
            {
                (0, -1, "Root"),
                (1, 0, "Child 1"),
                (2, 0, "Child 2"),
                (3, 1, "Grandchild 1")
            };

            var provider = new SQLiteDatabaseProvider(null!);
            var builder = new StringBuilder();
            var lookup = items.ToLookup(i => i.parent);

            // Act
            provider.BuildIndentedPlanHtml(lookup, -1, builder);
            var result = builder.ToString();

            // Assert
            Assert.Contains("Root", result);
            Assert.Contains("Child 1", result);
            Assert.Contains("Child 2", result);
            Assert.Contains("Grandchild 1", result);
            Assert.Contains("<ul>", result);
            Assert.Contains("<li>", result);
        }
    }
}
