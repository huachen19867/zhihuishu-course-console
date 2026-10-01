[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
public class CourseWindows {
 public delegate bool Callback(IntPtr h, IntPtr p);
 [StructLayout(LayoutKind.Sequential)] public struct Rect {public int Left,Top,Right,Bottom;}
 public class Window {public int Left,Top,Right,Bottom;public string Title;}
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h,StringBuilder text,int count);
 [DllImport("user32.dll")] static extern bool EnumWindows(Callback c, IntPtr p);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out Rect r);
 public static Window[] Read(){var list=new List<Window>();EnumWindows((h,p)=>{uint pid;GetWindowThreadProcessId(h,out pid);try{if(IsWindowVisible(h)&&Process.GetProcessById((int)pid).ProcessName=="msedge"){Rect r;GetWindowRect(h,out r);var t=new StringBuilder(1024);GetWindowText(h,t,1024);list.Add(new Window{Left=r.Left,Top=r.Top,Right=r.Right,Bottom=r.Bottom,Title=t.ToString()});}}catch{}return true;},IntPtr.Zero);return list.ToArray();}
}
'@
ConvertTo-Json -InputObject @([CourseWindows]::Read()) -Compress
