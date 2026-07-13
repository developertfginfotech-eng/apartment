import { Body, Controller, Delete, Get, Param, Patch, Post, Request } from '@nestjs/common';
import { TodoService } from './todo.service';

@Controller('todo')
export class TodoController {
  constructor(private readonly svc: TodoService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.svc.findAllForUser(req.user?.id);
  }

  @Post()
  create(@Body() body: { text: string }, @Request() req: any) {
    return this.svc.create(req.user?.id, body.text);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Request() req: any) {
    return this.svc.toggle(req.user?.id, id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.svc.remove(req.user?.id, id);
  }
}
