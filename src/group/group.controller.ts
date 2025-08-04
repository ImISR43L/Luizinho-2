import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { GroupService } from './group.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  CreateGroupMessageDto,
  ManageMemberDto,
} from './dto/group.dto';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Groups')
@ApiCookieAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group (Costs 150 Gold)' })
  create(@Body() createGroupDto: CreateGroupDto, @Req() req: Request) {
    return this.groupService.create(createGroupDto, req.user['id']);
  }

  @Get('/discover')
  @ApiOperation({ summary: 'Get a list of all public groups to join' })
  findAllDiscoverable() {
    return this.groupService.findAllDiscoverable();
  }

  @Get('/mine')
  @ApiOperation({ summary: 'Get all groups the current user is a member of' })
  findMyGroups(@Req() req: Request) {
    return this.groupService.findUserGroups(req.user['id']);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed information about a specific group' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: "Update a group's info (Owner only, costs 300 Gold)",
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Req() req: Request,
  ) {
    return this.groupService.update(id, updateGroupDto, req.user['id']);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group (Owner only, costs 500 Gold)' })
  deleteGroup(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.groupService.deleteGroup(id, req.user['id']);
  }

  @Post(':id/join')
  @ApiOperation({
    summary: 'Join a public group or request to join a private one',
  })
  join(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.groupService.joinGroup(id, req.user['id']);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a group you are a member of' })
  @HttpCode(HttpStatus.OK)
  leave(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.groupService.leaveGroup(id, req.user['id']);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get the chat messages for a group' })
  getMessages(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.groupService.getMessages(id, req.user['id']);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: "Post a new message to a group's chat" })
  postMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Body() createMessageDto: CreateGroupMessageDto,
  ) {
    return this.groupService.postMessage(id, req.user['id'], createMessageDto);
  }

  @Post(':id/members/:userId/approve')
  @ApiOperation({
    summary: 'Approve a pending join request (Admin/Owner only)',
  })
  approveRequest(
    @Param('id', ParseUUIDPipe) id: string, 
    @Param('userId', ParseUUIDPipe) userId: string, 
    @Req() req: Request,
  ) {
    return this.groupService.approveRequest(id, userId, req.user['id']);
  }

  @Patch(':id/members')
  @ApiOperation({ summary: "Change a member's role (Admin/Owner only)" })
  manageMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Body() manageDto: ManageMemberDto,
  ) {
    return this.groupService.manageMemberRole(id, req.user['id'], manageDto);
  }

  @Delete(':id/members/:userId/kick')
  @ApiOperation({ summary: 'Kick a member from a group (Admin/Owner only)' })
  kickMember(
    @Param('id', ParseUUIDPipe) id: string, 
    @Param('userId', ParseUUIDPipe) userId: string, 
    @Req() req: Request,
  ) {
    return this.groupService.kickMember(id, req.user['id'], userId);
  }

  @Delete(':id/members/:userId/reject')
  @ApiOperation({ summary: 'Reject a pending join request (Admin/Owner only)' })
  rejectRequest(
    @Param('id', ParseUUIDPipe) id: string, 
    @Param('userId', ParseUUIDPipe) userId: string, 
    @Req() req: Request,
  ) {
    return this.groupService.rejectRequest(id, userId, req.user['id']);
  }
}
