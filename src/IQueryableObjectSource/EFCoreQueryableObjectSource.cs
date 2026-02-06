using Microsoft.VisualStudio.DebuggerVisualizers;
using System;
using System.Data.Common;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;

namespace IQueryableObjectSource;

public class EFCoreQueryableObjectSource : VisualizerObjectSource
{
    private static readonly string ResourcesLocation = Path.Combine(Path.GetDirectoryName(Path.GetDirectoryName(typeof(EFCoreQueryableObjectSource).Assembly.Location)), "Resources");

    public override void TransferData(object target, Stream incomingData, Stream outgoingData)
    {
        if (target is not IQueryable queryable)
        {
            return;
        }

        try
        {
            var operationType = ReadOperationType(incomingData);
            switch (operationType)
            {
                case OperationType.GetQuery:
                    GetQuery(queryable, outgoingData);
                    break;
                case OperationType.GetQueryPlan:
                    GetQueryPlan(queryable, outgoingData);
                    break;
                case OperationType.Unknown:
                default:
                    outgoingData.WriteError("Unknown operation type");
                    break;
            }
        }
        catch (Exception ex)
        {
            outgoingData.WriteError(ex.Message);
        }
    }

    private static void GetQuery(IQueryable queryable, Stream outgoingData)
    {
        if (!TryGetQueryString(queryable, out var query, out var errorMessage))
        {
            outgoingData.WriteError(errorMessage);
            return;
        }

        var html = GenerateQueryFile(query);
        outgoingData.WriteSuccess(html);
    }

    private static void GetQueryPlan(IQueryable queryable, Stream outgoingData)
    {
        if (!TryCreateDbCommand(queryable, out var command, out var errorMessage))
        {
            outgoingData.WriteError(errorMessage);
            return;
        }

        using (command)
        {
            var provider = GetDatabaseProvider(command);

            if (provider == null)
            {
                outgoingData.WriteError($"Unsupported database provider {command.GetType().FullName}");
                return;
            }

            try
            {
                if (!TryGetQueryString(queryable, out var query, out errorMessage))
                {
                    outgoingData.WriteError(errorMessage);
                    return;
                }

                var rawPlan = provider.ExtractPlan();

                var planFile = GeneratePlanFile(provider, query, rawPlan);

                outgoingData.WriteSuccess(planFile);
            }
            catch (Exception ex)
            {
                outgoingData.WriteError($"Failed to extract execution plan. {ex.Message}");
            }
        }
    }

    private static string GeneratePlanFile(DatabaseProvider provider, string query, string rawPlan)
    {
        var planDirectory = provider.GetPlanDirectory(ResourcesLocation);
        var planFile = Path.Combine(planDirectory, Path.ChangeExtension(Path.GetRandomFileName(), "html"));

        var planPageHtml = File.ReadAllText(Path.Combine(planDirectory, "template.html"))
            .Replace("{plan}", provider.Encode(rawPlan))
            .Replace("{query}", provider.Encode(query));

        File.WriteAllText(planFile, planPageHtml);

        return planFile;
    }

    private static string GenerateQueryFile(string query)
    {
        var templatePath = Path.Combine(ResourcesLocation, "Common", "template.html");
        if (!File.Exists(templatePath))
        {
            throw new FileNotFoundException("Common Query template file not found", templatePath);
        }

        var queryDirectory = Path.Combine(ResourcesLocation, "Common");
        var queryFile = Path.Combine(queryDirectory, Path.ChangeExtension(Path.GetRandomFileName(), "html"));

        var templateContent = File.ReadAllText(templatePath);

        var finalHtml = templateContent.Replace("{query}", WebUtility.HtmlEncode(query));

        File.WriteAllText(queryFile, finalHtml);

        return queryFile;
    }

    private static OperationType ReadOperationType(Stream stream)
    {
        var operationBuffer = new byte[1];
        if (stream.Read(operationBuffer, 0, 1) == operationBuffer.Length)
        {
            if (Enum.IsDefined(typeof(OperationType), operationBuffer[0]))
            {
                return (OperationType)operationBuffer[0];
            }
        }
        return OperationType.Unknown;
    }

    private static DatabaseProvider GetDatabaseProvider(DbCommand command)
    {
        return command.GetType().FullName switch
        {
            "Microsoft.Data.SqlClient.SqlCommand" => new SqlServerDatabaseProvider(command),
            "Npgsql.NpgsqlCommand" => new PostgresDatabaseProvider(command),
            "Oracle.ManagedDataAccess.Client.OracleCommand" => new OracleDatabaseProvider(command),
            "Microsoft.Data.Sqlite.SqliteCommand" => new SQLiteDatabaseProvider(command),
            _ => null
        };
    }

    private static bool TryGetQueryString(IQueryable queryable, out string query, out string errorMessage)
    {
        var method = GetRelationalQueryableMethod("ToQueryString", typeof(string));
        if (method == null)
        {
            query = string.Empty;
            errorMessage = "Unable to locate EF Core method ToQueryString. Ensure EF Core 5 or newer is referenced by the debuggee.";
            return false;
        }

        try
        {
            query = (string)method.Invoke(null, new object[] { queryable });
            errorMessage = string.Empty;
            return true;
        }
        catch (TargetInvocationException ex)
        {
            query = string.Empty;
            errorMessage = ex.InnerException?.Message ?? ex.Message;
            return false;
        }
        catch (Exception ex)
        {
            query = string.Empty;
            errorMessage = ex.Message;
            return false;
        }
    }

    private static bool TryCreateDbCommand(IQueryable queryable, out DbCommand command, out string errorMessage)
    {
        var method = GetRelationalQueryableMethod("CreateDbCommand", typeof(DbCommand));
        if (method == null)
        {
            command = null;
            errorMessage = "Unable to locate EF Core method CreateDbCommand. Ensure EF Core 5 or newer with relational provider is referenced by the debuggee.";
            return false;
        }

        try
        {
            command = (DbCommand)method.Invoke(null, new object[] { queryable });
            errorMessage = string.Empty;
            return true;
        }
        catch (TargetInvocationException ex)
        {
            command = null;
            errorMessage = ex.InnerException?.Message ?? ex.Message;
            return false;
        }
        catch (Exception ex)
        {
            command = null;
            errorMessage = ex.Message;
            return false;
        }
    }

    private static MethodInfo GetRelationalQueryableMethod(string name, Type returnType)
    {
        const string typeName = "Microsoft.EntityFrameworkCore.RelationalQueryableExtensions";
        var type = Type.GetType($"{typeName}, Microsoft.EntityFrameworkCore.Relational")
            ?? Type.GetType($"{typeName}, Microsoft.EntityFrameworkCore");

        if (type == null)
        {
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                type = assembly.GetType(typeName);
                if (type != null)
                {
                    break;
                }
            }
        }

        return type?.GetMethods(BindingFlags.Public | BindingFlags.Static)
            .FirstOrDefault(method => method.Name == name
                && method.ReturnType == returnType
                && method.GetParameters().Length == 1
                && method.GetParameters()[0].ParameterType == typeof(IQueryable));
    }
}
