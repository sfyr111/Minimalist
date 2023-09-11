---
title: 使用sftp操作远程服务器
date: 2018-01-22 13:07:02
tags: sftp
categories: network
---
## 远程连接服务器
```
sftp user@xxx.xxx.xxx
exit // 退出
```
## 与Bash相似的功能
```
pwd // 查看当前路径
ls 
ls -la
cd
```
## 进行本地操作
```
lpwd // 查看本地路径
lls
lcd
```
## 使用sftp传输文件
```
// 下载文件
get remote_file_name
// 下载重命名
get remote_file_name local_file_name
// 下载文件夹
get -r some_directory_name
// 下载并保持信息
get -Pr some_directory_name
```
```
// 上传文件
put local_file_name
// 上传文件夹
put -r local_directory_name
```

## 查看磁盘
```
df -h // 查看磁盘大小
! // 切换本地使用bash命令
exit // 返回远程服务器进行sftp操作
```

[参考文章](https://linuxstory.org/how-to-use-sftp-to-securely-transfer-files-with-a-remote-server/)