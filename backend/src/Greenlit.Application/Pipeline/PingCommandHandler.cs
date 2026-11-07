using Greenlit.Application.Exceptions;
using MediatR;

namespace Greenlit.Application.Pipeline;

public sealed class PingCommandHandler : IRequestHandler<PingCommand, PingResponse>
{
    public Task<PingResponse> Handle(PingCommand request, CancellationToken cancellationToken) =>
        request.Mode switch
        {
            "notfound" => throw new NotFoundException("Ping target", request.Mode),
            "conflict" => throw new ConflictException("Ping conflict triggered."),
            "fail" => throw new InvalidOperationException("Ping failure triggered."),
            _ => Task.FromResult(new PingResponse("pong"))
        };
}
