using System;
using System.Data.Common;
using Xunit;
using IQueryableObjectSource;

namespace IQueryableObjectSource.Tests;

public class DatabaseProviderTests
{
    private class TestDatabaseProvider : DatabaseProvider
    {
        public TestDatabaseProvider() : base(null!)
        {
        }

        protected override string ExtractPlanInternal(DbCommand command, bool analyze) => throw new NotImplementedException();
        internal override string GetPlanDirectory(string baseDirectory) => throw new NotImplementedException();
    }

    private readonly TestDatabaseProvider _provider = new();

    [Theory]
    [InlineData(null, "")]
    [InlineData("", "")]
    [InlineData("normal string", "normal string")]
    [InlineData(@"string with \ backslash", @"string with \\ backslash")]
    [InlineData(@"string with "" quote", @"string with \"" quote")]
    [InlineData("string with ' single quote", @"string with \' single quote")]
    [InlineData("line\rreturn", @"line\rreturn")]
    [InlineData("new\nline", @"new\nline")]
    [InlineData("tab\tcharacter", @"tab\tcharacter")]
    [InlineData("backtick`", @"backtick\`")]
    [InlineData("${expression}", @"$\{expression}")]
    [InlineData("mixed \" ' \\ \n \r \t ` ${", @"mixed \"" \' \\ \n \r \t \` $\{")]
    public void Encode_ReturnsExpectedResult(string? input, string expected)
    {
        // Act
        var result = _provider.Encode(input!);

        // Assert
        Assert.Equal(expected, result);
    }
}
