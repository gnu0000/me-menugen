#!/Perl/bin/perl
#
# MenuGen - (c)2018 Craig Fitzgerald
# This program generates rtf menus for Sweetwater Branch Inn

use strict;
use CGI ':cgi';  # Just want cgi handling routines, no html writing
use CGI::Carp qw(fatalsToBrowser);
use JSON;
use Gnu::DebugUtil qw(DumpHash DumpRef);
use Gnu::StringUtil qw(Trim);

#globals
   my $DATA_DIR = "c:/apache/cgi-bin/menugen";
   my $TEMPLATES;

MAIN:
   ReadTemplates ("rtf" , "RtfData.txt"); # rtf templates in rtf data file
   ReadTemplates ("data", "RefData.txt"); # data in ref data file
   #DebugDumpTemplates ();

   my $Cmd = param ('cmd');
   SaveItem  () if $Cmd =~ m/^save/i;
   DeleteItem() if $Cmd =~ m/^delete/i;
   Generate  () if $Cmd =~ m/^generate/i;
   GetRefData();
   exit (0);


sub GetRefData
   {
   my $data;

   print "Content-type: application/json\n\n";
   foreach my $entry (sort keys %{$TEMPLATES->{data}})
      {
      my ($type, $name) = $entry =~ /^(.+)#(.+)$/;
      $data->{$type}->{$name} = $TEMPLATES->{data}->{$entry};
      }
   print to_json($data);
   exit (0);
   }

sub SaveItem
   {
   my $Context = GetContext();
   my $Type    = $Context->{type};
   my $Name    = $Context->{name};
   my $OldName = $Context->{oldname};
   my $Val     = $Context->{val};
   $Val =~ s/\r\n/\n/g; # textareas screw up line terminators
   chomp $Val;
   chomp $Val;
   chomp $Val;
   chomp $Val;
   $Val .= "\n\n";

   # insert / replace changed item
   delete $TEMPLATES->{"data"}->{$Type . "#" . $OldName};
   $TEMPLATES->{"data"}->{$Type . "#" . $Name} = $Val;

   WriteDataTemplates ($Context);
   }

   
sub DeleteItem
   {
   my $Context = GetContext();
   my $Type    = $Context->{type};
   my $Name    = $Context->{name};

   delete $TEMPLATES->{"data"}->{$Type . "#" . $Name};
   WriteDataTemplates ($Context);
   }


sub Generate
   {
   my $Context = GetContext ();

   print "Content-type: application/rtf\n\n";

   my $IsBuffet = (param("meal") =~ m/Buffet/i);
   my $IsDinner = (param("meal") =~ m/Dinner/i);
   $Context->{mealtypemessage}  = $IsBuffet ?  "On The Buffet Line" : "Choice of:";
   $Context->{whichmealmessage} = $IsDinner ?  "Dinner Menu" : "Lunch/Brunch Menu";

   print Template("rtf", "document_start", %{$Context});
   print Template("rtf", "menu_start"    , %{$Context});

   print Template("rtf", "snack_start", %{$Context});
   GenerateRTFblock ("snack"   , "food" , "snackchoice1");
   GenerateRTFblock ("snack"   , "food" , "snackchoice2");
   GenerateRTFblock ("snack"   , "food" , "snackchoice3");
   GenerateRTFblock ("snack"   , "food" , "snackchoice4");
   GenerateRTFblock ("snack"   , "food" , "snackchoice5");
   GenerateRTFblock ("snack"   , "food" , "snackchoice6");
   GenerateRTFblock ("snack"   , "food" , "snackchoice7");
   GenerateRTFblock ("snack"   , "food" , "snackchoice8");
   GenerateRTFblock ("snack"   , "food" , "snackchoice9");
   print Template("rtf", "snack_end", %{$Context});

   print Template("rtf", "meal", %{$Context});

   print Template("rtf", "salad_start", %{$Context});
   GenerateRTFblock ("salad"   , "food" , "saladchoice");
   print Template("rtf", "salad_end", %{$Context});

   print Template("rtf", "main_start", %{$Context});
   GenerateRTFblock ("main"   , "food" , "mainchoice1");
   GenerateRTFblock ("main"   , "food" , "mainchoice2");
   GenerateRTFblock ("main"   , "food" , "mainchoice3");
   GenerateRTFblock ("main"   , "food" , "mainchoice4");
   GenerateRTFblock ("main"   , "food" , "mainchoice5");
   GenerateRTFblock ("main"   , "food" , "mainchoice6");
   GenerateRTFblock ("main"   , "food" , "mainchoice7");
   GenerateRTFblock ("main"   , "food" , "mainchoice8");
   GenerateRTFblock ("main"   , "food" , "mainchoice9");
   print Template("rtf", "main_end", %{$Context});

   if (!($Context->{dessertchoice} =~ m[^\(]))
      {
      print Template("rtf", "dessert_start", %{$Context});
      GenerateRTFblock ("dessert", "dessert", "dessertchoice");
      print Template("rtf", "dessert_end", %{$Context});
      }

   if (!($Context->{barchoice} =~ m[^\(]))
      {
      print Template("rtf", "bar_start", %{$Context});
      GenerateRTFblock ("bar", "bar" ,"barchoice");
      print Template("rtf", "bar_end", %{$Context});
      }
   print Template("rtf", "menu_end"    , %{$Context});
   print Template("rtf", "cover_letter", %{$Context}) if $Context->{"gencover"};
   print Template("rtf", "rider",        %{$Context}) if $Context->{"genrider"};
   print Template("rtf", "document_end", %{$Context});
   exit (0);
   }


sub GenerateRTFblock
   {
   my ($RtfType, $ChoiceType, $ChoiceName) = @_;

   $ChoiceName  = $ChoiceName || $ChoiceType;
   my $Context  = GetContext ();
   my $Choice   = $Context->{$ChoiceName};
   return if $Choice =~ m[^\(];

   my $TemplateName = $ChoiceType . "#" . $Choice;
   my $Content      = Template ("data", $TemplateName, %{$Context});

   print Template("rtf", $RtfType . "_entry_start");
   map {print Template("rtf", $RtfType . "_entry_line" , line => $_)} split "\n", $Content;
   print Template("rtf", $RtfType . "_entry_end");
   }


sub GetContext
   {
   my %Context;
   map {$Context{$_} = "" . param ("$_");} param;
   return \%Context;
   }

sub Template
   {
   my ($Type, $TemplateName, %TemplateParams) = @_;
   my $TemplateData = $TEMPLATES->{$Type}->{$TemplateName};
   map {$TemplateData =~ s{\$$_([^a-zA-Z_])}{$TemplateParams{$_}$1}gi;} (keys %TemplateParams);
   return $TemplateData;
   }

sub ReadTemplates
   {
   my ($Type, $TemplateFile) = @_;

   my $filespec = "$DATA_DIR/$TemplateFile";
   my $FileExists = ($TemplateFile  && -e $filespec);
   open (TEMPLATEFILE, "<$filespec") if $FileExists;
   my $FileHandle = ($FileExists ? *TEMPLATEFILE : *DATA);
   my $Key;

   while (<$FileHandle>)
      {
      next if ($_ =~ /^#+\s*$/);
      ($_ =~ /^#(.+)$/) ? {$Key = Trim($1)} : {$TEMPLATES->{$Type}->{$Key} .= $_};
      };
   close (TEMPLATEFILE) if $FileExists;
   }

sub WriteDataTemplates
   {
   my ($Context) = @_;

   my $OutFile;
   open ($OutFile, ">", "$DATA_DIR/RefData.txt") or die ("can't open file $DATA_DIR/RefData.txt");

   foreach my $Key (sort keys %{$TEMPLATES->{"data"}})
      {
      my $Content = Template ("data", $Key, %{$Context});
      print $OutFile "#\n#$Key\n$Content";
      }
   close ($OutFile);
   }

sub DebugDumpTemplates
   {
   print "Content-type: text/plain\n\n";

   foreach my $Type (sort keys %{$TEMPLATES})
      {
      foreach my $entry (sort keys %{$TEMPLATES->{$Type}})
         {
         print "*** $Type : $entry ***\n $TEMPLATES->{$Type}->{$entry}\n\n";
         }
      }
   print "\n******\n";
   print Template ("rtf", "document_start");
   print "\n******\n";
   exit (0);
   }

__END__
