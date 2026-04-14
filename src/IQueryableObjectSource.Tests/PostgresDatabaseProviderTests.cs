using System;
using System.Collections;
using System.Data;
using System.Data.Common;
using System.Linq;
using IQueryableObjectSource;
using Xunit;

namespace IQueryableObjectSource.Tests;

public class PostgresDatabaseProviderTests
{
    private class MockDbDataReader(params string[] rows) : DbDataReader
    {
        private int _index = -1;
        private readonly string[] _rows = rows;

        public override bool Read() => ++_index < _rows.Length;
        public override string GetString(int ordinal) => _rows[_index];
        public override int FieldCount => 1;
        public override bool HasRows => _rows.Length > 0;

        public override bool IsDBNull(int ordinal) => false;
        public override object GetValue(int ordinal) => GetString(ordinal);
        public override int GetValues(object[] values) { values[0] = GetString(0); return 1; }
        public override bool GetBoolean(int ordinal) => throw new NotImplementedException();
        public override byte GetByte(int ordinal) => throw new NotImplementedException();
        public override long GetBytes(int ordinal, long dataOffset, byte[]? buffer, int bufferOffset, int length) => throw new NotImplementedException();
        public override char GetChar(int ordinal) => throw new NotImplementedException();
        public override long GetChars(int ordinal, long dataOffset, char[]? buffer, int bufferOffset, int length) => throw new NotImplementedException();
        public override Guid GetGuid(int ordinal) => throw new NotImplementedException();
        public override short GetInt16(int ordinal) => throw new NotImplementedException();
        public override int GetInt32(int ordinal) => throw new NotImplementedException();
        public override long GetInt64(int ordinal) => throw new NotImplementedException();
        public override DateTime GetDateTime(int ordinal) => throw new NotImplementedException();
        public override float GetFloat(int ordinal) => throw new NotImplementedException();
        public override double GetDouble(int ordinal) => throw new NotImplementedException();
        public override decimal GetDecimal(int ordinal) => throw new NotImplementedException();
        public override string GetDataTypeName(int ordinal) => "text";
        public override Type GetFieldType(int ordinal) => typeof(string);
        public override string GetName(int ordinal) => "plan";
        public override int GetOrdinal(string name) => 0;
        public override int Depth => 0;
        public override bool IsClosed => false;
        public override int RecordsAffected => 0;
        public override object this[int ordinal] => GetString(ordinal);
        public override object this[string name] => GetString(0);
        public override bool NextResult() => false;
    }

    private class MockDbCommand : DbCommand
    {
        public string[]? PlansToReturn { get; set; }

        public override string CommandText { get; set; } = "";
        public override int CommandTimeout { get; set; }
        public override CommandType CommandType { get; set; }
        public override bool DesignTimeVisible { get; set; }
        public override UpdateRowSource UpdatedRowSource { get; set; }
        protected override DbConnection? DbConnection { get; set; }
        protected override DbParameterCollection DbParameterCollection => throw new NotImplementedException();
        protected override DbTransaction? DbTransaction { get; set; }

        public override void Cancel() { }
        public override int ExecuteNonQuery() => 0;
        public override object? ExecuteScalar() => null;
        public override void Prepare() { }

        protected override DbParameter CreateDbParameter() => throw new NotImplementedException();

        protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
        {
            return new MockDbDataReader(PlansToReturn ?? Array.Empty<string>());
        }
    }

    private class ExposedPostgresDatabaseProvider(DbCommand command) : PostgresDatabaseProvider(command)
    {
        public string ExposedExtractPlanInternal(DbCommand command, bool analyze)
            => ExtractPlanInternal(command, analyze);
    }

    [Fact]
    public void ExtractPlanInternal_WithEmptyResult_ReturnsEmptyString()
    {
        // Arrange
        var command = new MockDbCommand();
        var provider = new ExposedPostgresDatabaseProvider(command);

        // Act
        var result = provider.ExposedExtractPlanInternal(command, false);

        // Assert
        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void ExtractPlanInternal_WithPlan_ReturnsJoinedPlan()
    {
        // Arrange
        var command = new MockDbCommand { PlansToReturn = new[] { "Line 1", "Line 2" } };
        var provider = new ExposedPostgresDatabaseProvider(command);

        // Act
        var result = provider.ExposedExtractPlanInternal(command, false);

        // Assert
        Assert.Equal("Line 1" + Environment.NewLine + "Line 2", result);
    }

    [Theory]
    [InlineData(false, "EXPLAIN (COSTS, VERBOSE) ")]
    [InlineData(true, "EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS) ")]
    public void ExtractPlanInternal_SetsCorrectCommandText(bool analyze, string expectedPrefix)
    {
        // Arrange
        var command = new MockDbCommand { CommandText = "SELECT * FROM Users" };
        var provider = new ExposedPostgresDatabaseProvider(command);

        // Act
        provider.ExposedExtractPlanInternal(command, analyze);

        // Assert
        Assert.StartsWith(expectedPrefix, command.CommandText);
        Assert.EndsWith("SELECT * FROM Users", command.CommandText);
    }
}
