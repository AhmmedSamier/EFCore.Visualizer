using System.Data.Common;
using IQueryableObjectSource;

namespace IQueryableObjectSource.Tests;

public class DatabaseProviderTests
{
    private class TestDatabaseProvider(DbCommand command) : DatabaseProvider(command)
    {
        protected override string ExtractPlanInternal(DbCommand command, bool analyze) => string.Empty;
        internal override string GetPlanDirectory(string baseDirectory) => string.Empty;
    }

    [Fact]
    public void Encode_ShouldEscapeSpecialCharacters()
    {
        // Arrange
        var provider = new TestDatabaseProvider(null!);
        var input = "backslash:\\, double-quote:\", single-quote:', CR:\r, LF:\n, tab:\t, backtick:`, template:${";
        var expected = "backslash:\\\\, double-quote:\\\", single-quote:\\', CR:\\r, LF:\\n, tab:\\t, backtick:\\`, template:$\\{";

        // Act
        var result = provider.Encode(input);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Encode_ShouldEscapeHtmlTags()
    {
        // Arrange
        var provider = new TestDatabaseProvider(null!);
        var input = "</script><script>alert(1)</script>";
        var expected = "\\u003C/script\\u003E\\u003Cscript\\u003Ealert(1)\\u003C/script\\u003E";

        // Act
        var result = provider.Encode(input);

        // Assert
        Assert.Equal(expected, result);
    }
}
