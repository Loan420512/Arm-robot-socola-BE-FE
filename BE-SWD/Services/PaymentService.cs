using ChocoRobot.Common;
using ChocoRobot.DTOs.Payment;
using ChocoRobot.Interfaces.Repositories;
using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChocoRobot.Services;

public class PaymentService(IRepository<Payment> repository)
{
    public async Task<ResponseDto> ByOrder(int id)
    {
        var payment = await repository.Query().SingleOrDefaultAsync(payment => payment.OrderId == id)
            ?? throw new ApiException(404, "Payment not found");

        return CrudService<Payment, CreateRequest, UpdateRequest, ResponseDto>.Map(payment);
    }
}
